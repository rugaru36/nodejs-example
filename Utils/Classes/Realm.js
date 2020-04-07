const Util = require('../Util.js')
const util = new Util()
const uuidv4 = require('uuid/v4')
const fs = require('fs')
const realmSchemes = require('../RealmSchemes.js')

class Realm {
  constructor () {
    const RealmBaseClass = require('realm')

    this.jwt = require('jsonwebtoken')
    this.uuidv4 = require('uuid/v4')
    try {
      this.base = new RealmBaseClass({
        path: '/root/app/Realm/Realm',
        schema: realmSchemes,
        schemaVersion: 16
      })
    } catch (e) {
      console.log(e.message)
    }
  }

  checkIsPropInSchema (propName, collectionName) {
    let buffArray = []
    for (const i in this.base.schema) {
      if (this.base.schema[i].name !== collectionName) {
        continue
      }
      buffArray = Array.from(Object.keys(this.base.schema[i].properties))
      if (buffArray.indexOf(propName) !== -1) {
        return true
      }
    }
    return false
  }

  /*
    обработка вложенных объектов, например чтобы в базу нормально отправлялись
    вложенные объекты любой глубины (платёжка внутри клиента внутри заказа)
  */
  processNestedObjects (object) {
    if (JSON.stringify(object) === JSON.stringify({})) return
    if (object == null) return
    try {
      if (object[0] !== undefined) {
        const objectLength = Object.keys(object).length
        /* массив из извлеченных ключей первого элемента */
        const keysArr = Object.keys(object[0])
        for (let i = 0; i < objectLength; i++) {
        /* поиск по ключам  */
          for (const j in keysArr) {
            if (typeof object[i][keysArr[j]] === 'object') {
              let nestedObject = object[i][keysArr[j]]
              /*
               * если значение вложенного объекта null
               * заменить на массив и продолжить поиск
               */
              if (nestedObject == null) {
                nestedObject = []
                // console.log('ewq')
                continue
              }
              /* вызов функции с вложенным объектом */
              this.processNestedObjects(nestedObject)
              /* замена вложенного объекта на массив значений */
              object[i][keysArr[j]] = Object.values(nestedObject)
            }
          }
        }
      } else if (object[0] === undefined) {
        const keysArr = Object.keys(object)
        /* поиск вложенного объекта по ключам  */
        for (const j in keysArr) {
        /*
         *  поиск вложенного объекта
         *  если тип данных значения ключа == 'object'
         *  keysArr[j] ключи объекта
         */
          if (typeof object[keysArr[j]] === 'object') {
            const nestedObject = object[keysArr[j]]
            /* если это null продолжить поиск */
            if (nestedObject === null) {
            // object[keysArr[j]] = []
            // console.log('qwe')
              continue
            }
            /* вызов функции с вложенным объектом */
            this.processNestedObjects(nestedObject)
            /* замена вложенного объекта на массив значений */
            object[keysArr[j]] = Object.values(nestedObject)
          }
        }
      }
    } catch (e) {
      console.log({ error: e.message })
    }
  }

  getPropType (propName, collectionName) {
    let buffProps
    for (var i in this.base.schema) {
      if (this.base.schema[i].name !== collectionName) {
        continue
      } else {
        buffProps = this.base.schema[i].properties
      }
    }
    return buffProps[propName].type
  }

  dealWithBase (body) {
    const router = body.router
    // const collectionName = body.collectionName
    if (router === undefined) {
      return { error: 'router is undefined' }
    }

    switch (router) {
      case 'update':
        return this.updateData(body)
      case 'delete':
        return this.deleteData(body)
      case 'fetch':
        return this.fetchData(body)
      case 'link':
        return this.linkData(body)
      case 'linkList':
        return this.linkListData(body)
      default:
        return { error: 'Router is wrong' }
    }
  }

  updateData (body) {
    const collectionName = body.collectionName
    const collection = this.base.objects(collectionName)
    let elementId = body.elementId
    let element
    try {
      if (collectionName === undefined) {
        return { error: 'collection name is undefined' }
      } else if (collection === undefined) {
        return { error: `collection ${collectionName} is not found` }
      }
      if (elementId === '' || elementId === undefined) elementId = uuidv4()
      element = collection.filtered(`hashId = "${elementId}"`)[0]
      console.log(element)
    } catch (err) {
      return { error: err.message }
    }
    let inputDataToUpdate = body.jsonValues
    if (typeof inputDataToUpdate === 'string') {
      inputDataToUpdate = JSON.parse(inputDataToUpdate)
    }
    const inputValues = Object.values(inputDataToUpdate)
    const inputKeys = Object.keys(inputDataToUpdate)
    for (const i in inputValues) {
      if (!this.checkIsPropInSchema(inputKeys[i], collectionName)) {
        return ({ error: `field ${inputKeys[i]} does not exist in schema ${collectionName}` })
      }
      if (inputKeys[i] === 'hashId') return ({ error: 'Can`t change hashId field' })
      // если в строке записано число, и требуется число в базе
      const propType = this.getPropType(inputKeys[i], collectionName)
      if (!isNaN(inputValues[i]) && propType !== 'string') inputValues[i] *= 1
    }
    if (util.isUndefined(element)) {
      try {
        if (collectionName === 'Config' && collection.length !== 0) {
          return { error: 'Cannot create new Config' }
        }
        // миллисекунды в секунды
        const currDate = Date.now() / 1000
        const data = { hashId: elementId, isExist: true, created: currDate, updated: currDate }
        const objectsKeys = []
        const objects = []
        for (const i in inputKeys) {
          if (this.getPropType(inputKeys[i], collectionName) === 'bool') {
            inputValues[i] = (Boolean(inputValues[i]) && inputValues[i] !== 'false')
            data[inputKeys[i]] = inputValues[i]
          } else if (typeof inputValues[i] !== 'object' && data[inputKeys[i]] === undefined) {
            data[inputKeys[i]] = inputValues[i]
          } else if (typeof inputValues[i] === 'object' && data[inputKeys[i]] === undefined) {
            this.processNestedObjects(inputValues[i])
            console.log('object', inputValues[i])
            objectsKeys.push(inputKeys[i])
            objects.push(inputValues[i])
          }
        }
        this.base.write(() => {
          console.log(data)
          element = this.base.create(collectionName, data)
          for (const i in objectsKeys) {
            element[objectsKeys[i]] = objects[i]
          }
        })
      } catch (e) {
        console.log(e.message)
        return { error: e.message }
      }
    } else {
      inputKeys.push('updated')
      inputValues.push(Date.now() / 1000).toFixed()
      this.base.write(() => {
        try {
          for (var i in inputValues) {
            if (this.getPropType(inputKeys[i], collectionName) === 'bool') {
              inputValues[i] = (Boolean(inputValues[i]) && inputValues[i] !== 'false')
            }
            try {
              if (typeof inputValues[i] === 'object') {
                this.processNestedObjects(inputValues[i])
              }
              element[inputKeys[i]] = inputValues[i]
            } catch (e) {
              console.log({ error: e.message })
              return { error: e.message }
            }
          }
        } catch (e) {
          return ({ error: e.message })
        }
      })
    }
    return element
  }

  linkData (body) {
    try {
      const propertyName = body.propertyName
      const linkFromHashId = body.linkFromHashId
      const linkToHashId = body.linkToHashId
      const linkFromCollectionName = body.linkFromCollectionName
      const linkToCollectionName = body.linkToCollectionName

      const linkFromObject = this.dealWithBase({
        router: 'fetch',
        collectionName: linkFromCollectionName,
        elementId: linkFromHashId
      })
      this.processNestedObjects(linkFromObject)
      return this.dealWithBase({
        router: 'update',
        elementId: linkToHashId,
        collectionName: linkToCollectionName,
        jsonValues: JSON.stringify({
          [propertyName]: linkFromObject
        })
      })
    } catch (e) {
      return { error: e.message }
    }
  }

  linkListData (body) {
    try {
      const propertyName = body.propertyName
      const linkListFromHashId = body.linkListFromHashId
      const linkToHashId = body.linkToHashId
      const linkFromCollectionName = body.linkFromCollectionName
      const linkToCollectionName = body.linkToCollectionName
      console.log('linksFromHashId', linksFromHashId)
      
      let linkList = []
      console.log('linksList', linkList)
      linkListFromHashId.forEach(linkFromHashId => {
        const linkFromObject = this.dealWithBase({
          router: 'fetch',
          collectionName: linkFromCollectionName,
          elementId: linkFromHashId
        })
        if (linkFromObject === undefined) throw Error('linkFromObject undefined')
        this.processNestedObjects(linkFromObject)
        linksList.push(linkFromObject)
      })
     
      return this.dealWithBase({
        router: 'update',
        elementId: linkToHashId,
        collectionName: linkToCollectionName,
        jsonValues: JSON.stringify({
          [propertyName]: linkList
        })
      })
    } catch (e) {
      return { error: e.message }
    }
  }

  deleteData (body) {
    const collectionName = body.collectionName
    const collection = this.base.objects(collectionName)
    const elementId = body.elementId
    let element
    try {
      if (collectionName === undefined) {
        return { error: 'collectionName is undefined' }
      } else if (collection === undefined) {
        return { error: 'collection ' + collectionName + ' is not found' }
      } else if (collection === 'Config') {
        return { error: 'Cannot delete config' }
      }
      element = collection.filtered(`hashId = "${elementId}"`)[0]
    } catch (e) {
      return { error: e.message }
    }

    if (element === undefined) {
      return { error: 'element is not found' }
    }
    this.base.write(() => {
      try {
        element.updated = Date.now() / 1000
        element.isExist = false
        console.log(`deletedData { element: "${element.name}" }`)
      } catch (e) {
        return { error: e.message }
      }
    })
    return { status: 'success' }
  }
  fetchData (body) {
    try {
      const collectionName = body.collectionName
      const elementId = body.elementId

      const collection = this.base.objects(collectionName)

      // пагинация по размеру и номеру страницы, если переданы pageSize и pageNum
      let firstItem, lastItem
      if (body.pageSize !== undefined && body.pageNum !== undefined) {
        const pageSize = +body.pageSize
        const pageNum = +body.pageNum
        lastItem = Math.floor(pageSize * (pageNum + 1))
        firstItem = lastItem - pageSize
      }

      // сортировка по дате, если не передано другое значение
      let sortBy = 'updated'
      if (body.sortBy !== undefined && body.sortBy !== '') sortBy = body.sortBy + ''

      // вывод по убыванию, если не передано значение ascending
      let howToSort = true
      if (body.sortType === 'ascending') howToSort = false

      // без привязки ко времени и без фильтра
      if ((body.cashTime === undefined || body.cashTime === 0) && (body.filter === undefined || body.filter === '')) {
        console.log('without filter')
        if (elementId === '' || elementId === undefined) {
          return collection
            .sorted(sortBy, howToSort)
            .slice(firstItem, lastItem)
        }
        console.log('by element')
        const element = collection.filtered(`hashId = "${elementId}"`)[0]
        if (element === undefined) {
          return { error: 'object was not found' }
        }
        return element
      } else if (body.cashTime !== undefined && body.filter === undefined) {

        // только по времени
        const cashTime = body.cashTime
        console.log('by time')
        return collection
          .filtered('updated > ' + cashTime)
          .sorted(sortBy, howToSort)
          .slice(firstItem, lastItem)
      } else if (body.filter !== undefined && body.cashTime === undefined) {
        // только по фильтру
        const filter = body.filter
        console.log('by filter')
        return collection
          .filtered(filter)
          .sorted(sortBy, howToSort)
          .slice(firstItem, lastItem)
      } else if (body.filter !== undefined && body.cashTime !== undefined) {
        // по фильтру и времени
        const cashTime = body.cashTime
        const mainFilter = '(' + body.filter + ') && ' + 'updated > ' + cashTime
        console.log('by filter & time')
        return collection
          .filtered(mainFilter)
          .sorted(sortBy, howToSort)
          .slice(firstItem, lastItem)
      }
    } catch (e) {
      return { error: e.message }
    }
  }

  getConfig () {
    const config = this.dealWithBase({
      router: 'fetch',
      collectionName: 'Config',
      elementId: ''
    })
    return config[0]
  }

  getSchema () {
    return this.base.schema
  }
}
module.exports = Realm
