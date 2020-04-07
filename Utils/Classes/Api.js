class Api {
  constructor() {
    let realmClass = require('./Realm.js')
    let userClass = require('./User.js')
    this.realm = new realmClass()
    this.user = new userClass()
    this.uuidv4 = require('uuid/v4')
    this.axios = require("axios")
    this.md5 = require('md5')
    this.geolib = require('geolib')
  }
  /**
   * создание нового заказа
   * @param {Object} body запрос клиента
   * @param {string} userHashId 
   * @param {Object} config типы, цены и время действия
   * @returns {Object} данные заказа
   */
  createOrder(body, userHashId, config) {
    const getOrderType = () => {
      try {
        const orderType = body['orderType']
        const seconds = `secondsIn${orderType.match(/[0-9]+[a-z]/i)}`

        if (config[orderType] == undefined) throw new Error('price not found')

        for (let i in config) {
          if (config[i] == config[orderType]) {
            return {
              type: orderType,
              price: config[orderType],
              avaliableTime: config[seconds],
            }
          }
        }
      } catch (e) {
        return { 'error': e.message }
      }
    }
    const orderType = getOrderType()
    try {
      let
        type = orderType.type,
        avaliableTime = orderType.avaliableTime,
        price = orderType.price,

        productHashId = body['productHashId'],
        productSetHashId = body['productSetHashId'],
        orderNum = '',
        characters = 'ABCDEFGKLMNPRTXYZ0123456789'

      if (type == undefined) {
        throw new Error('getOrderType fail')
      } else if (productHashId == undefined) {
        throw new Error('productHashId is undefined')
      } else if (productSetHashId == undefined) {
        throw new Error('productSetHashId is undefined')
      }
      // номер заказа
      for (let i = 0; i < 8; i++) {
        orderNum += characters.charAt(Math.floor(Math.random() * characters.length))
      }
      if (productHashId != '') {
        console.log('SINGLE')
        let product = this.realm.dealWithBase({
          router: 'fetch',
          collectionName: 'Product',
          elementId: productHashId,
        })

        if (product.error != undefined) {
          throw new Error('product not found')
        } else {
          console.log({ 'PRODUCT': product })
          return this.realm.dealWithBase({
            router: 'update',
            collectionName: 'Order',
            elementId: '',
            jsonValues: JSON.stringify({
              userHashId: userHashId,
              __type: type,
              avaliableTime: avaliableTime,
              price: price,
              product: product,
              orderNum: orderNum,
              status: 'created',
            })
          })
        }
      }
      // set
      else if (productSetHashId != '') {
        let productSet = this.realm.dealWithBase({
          router: 'fetch',
          collectionName: 'ProductSet',
          elementId: productSetHashId,
        })
        if (productSet.error != undefined) {
          throw new Error('productSet not found')
        } else {
          return this.realm.dealWithBase({
            router: 'update',
            collectionName: 'Order',
            elementId: '',
            jsonValues: JSON.stringify({
              userHashId: userHashId,
              __type: type,
              avaliableTime: avaliableTime,
              price: price,
              productSet: productSet,
              orderNum: orderNum,
              status: 'created',
            })
          })
        }
      }
      else if (type == 'vipAccess3M' || type == 'vipAccess6M' || type == 'vipAccess12M') {
        return this.realm.dealWithBase({
          router: 'update',
          collectionName: 'Order',
          elementId: '',
          jsonValues: JSON.stringify({
            userHashId: userHashId,
            __type: type,
            avaliableTime: avaliableTime,
            price: price,
            orderNum: orderNum,
            status: 'created',
          })
        })
      } else {
        throw new Error('createOrder fail')
      }
    } catch (e) {
      return { 'error': e.message }
    }
  }

  createInvite(userHashId) {
    if (userHashId === undefined) throw Error('createInvite: userHashId not found')
    const characters = '0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    this.realm.dealWithBase({
      router: 'update',
      collectionName: 'InviteCode',
      elementId: '',
      jsonValues: JSON.stringify({
        userHashId: userHashId,
        code: code,
        isActivated: false,
      })
    })
    return { status: 'success', code: code }
  }

  activateInvite(body) {
    let code = body.code + ''
    console.log(typeof code)
    if (code === undefined || code === '') throw Error('activateInvite: code undefined')
    let test = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'InviteCode',
      elementId: '',
    })
    console.log(test)
    let inviteCode = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'InviteCode',
      elementId: '',
      filter: `code = "${code}" && isActivated = false`
    })
    console.log(inviteCode)
    inviteCode = inviteCode[0]
    if (inviteCode === undefined) throw Error('Неправильный код')
    if (userHashId === undefined || userHashId === '') throw Error('activateInvite: userHashId undefined')
    const userWhoInvites = inviteCode.userHashId
    const userWhoWasInvited = userHashId

    let whoInvitesObj = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'User',
      elementId: userWhoInvites
    })

    let whoWasInvitedObj = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'User',
      elementId: userWhoWasInvited
    })

    if (whoWasInvitedObj.isInvited === true) throw Error('Вы уже были приглашены')

    let isWhoInvitesVip = false
    let isWhoWasInvitedVip = false
    const checkIsUserVip = () => {
      if (whoInvitesObj.vipAccessTo > whoInvitesObj.updated) {
        isWhoInvitesVip = true
      }
      if (whoWasInvitedObj.vipAccessTo > whoWasInvitedObj.updated) {
        isWhoWasInvitedVip = true
      }
    }
    const dateInSeconds = Math.round(new Date() / 1000)
    const weekInSeconds = 604800
    const accessTo = dateInSeconds + weekInSeconds
    try {
      checkIsUserVip()
      console.log('isWhoInvitesVip', isWhoInvitesVip)
      console.log('isWhoWasInvitedVip', isWhoWasInvitedVip)
      if (isWhoInvitesVip === false) {
        console.log('user0 updated', accessTo)
        // правило: тот кто пригласил получает недлю вип
        this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: userWhoInvites,
          jsonValues: JSON.stringify({
            vipAccessTo: accessTo,
          })
        })
      }
      if (isWhoInvitesVip === true) {
        const nowVipAccessTo = whoInvitesObj.vipAccessTo
        const vipPlusWeek = nowVipAccessTo + weekInSeconds
        console.log('userWhoInvites', userWhoInvites)
        console.log('vip0', nowVipAccessTo)
        console.log('vip0 updated', vipPlusWeek)
        // правило: если тот кто пригласил уже вип + неделя
        this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: userWhoInvites,
          jsonValues: JSON.stringify({
            vipAccessTo: vipPlusWeek,
          })
        })
      }
      if (isWhoWasInvitedVip === false) {
        console.log('user1 updated', accessTo)
        // правило: тот кто приглашен получает недлю вип
        this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: userWhoWasInvited,
          jsonValues: JSON.stringify({
            vipAccessTo: accessTo,
            isInvited: true
          })
        })
      }
      if (isWhoWasInvitedVip === true) {
        const nowVipAccessTo = whoWasInvitedObj.vipAccessTo
        const vipPlusWeek = nowVipAccessTo + weekInSeconds
        console.log('vip1', nowVipAccessTo)
        console.log('vip1 updated', vipPlusWeek)
        // правило: если тот кто приглашен уже вип + неделя
        this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: userWhoWasInvited,
          jsonValues: JSON.stringify({
            vipAccessTo: vipPlusWeek,
            isInvited: true
          })
        })
      }
      this.realm.dealWithBase({
        router: 'update',
        collectionName: 'InviteCode',
        elementId: inviteCode.hashId,
        jsonValues: JSON.stringify({
          isActivated: true
        })
      })
      return { status: 'success', userWhoInvites }
    } catch (e) {
      return { error: e.message }
    }
  }

  phoneAuth(body) {
    try {
      let phone = body['phone']
      if (phone == '' || phone == undefined) {
        return ({ 'error': 'Номер не введён' })
      }
      let isAuth = body['isAuth'],
        result = this.user.sendCode(phone, isAuth)

      if (result.status == 'success') {
        let code = this.realm.dealWithBase({
          router: 'fetch',
          collectionName: 'smsValidation',
          elementId: '',
          filter: `phone = "${phone}"`
        })
        return { 'code': code[0].code, 'status': 'success' }
      }
      else return result
    } catch (e) {
      return { 'error': e.message }
    }
  }

  codeCheck(body, deviceId) {
    try {
      /* body - phone/code/name/email */
      let result = this.user.checkCode(body, deviceId)
      return result
    } catch (e) {
      return { 'error': e.message };
    }
  }

  mainLoad(body, userObj) {
    try {
      let currentTimestamp = (Date.now() / 1000).toFixed(0)
      let cashTime = body.cashTime;

      if (cashTime === undefined) cashTime = 0;
      let Document = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'Document',
        elementId: '',
        cashTime: 0
      }),
      Config = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'Config',
        elementId: '',
      }),
      Product = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'Product',
        elementId: '',
        cashTime: cashTime,
      }),
      ProductSet = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'ProductSet',
        elementId: '',
        cashTime: cashTime,
      }),
      Order = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'Order',
        elementId: '',
        filter: `userHashId = "${userObj.hashId}" && status = "accepted" && avaliableTime > ${currentTimestamp}`,
      }),
      Chackra = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'Chackra',
        elementId: '',
        cashTime: cashTime
      }),
      Announce = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'Announce',
        elementId: '',
        cashTime: cashTime
      })

      return {
        Chackra: Chackra,
        Config: Config,
        Announce: Announce,
        Document: Document,
        Product: Product,
        ProductSet: ProductSet,
        Order: Order,
      }
    }
    catch (e) {
      return { 'error': e.message }
    }
  }

  getCollectionSize(body) {
    console.log(collectionName)
    var collectionName = body['collectionName']
    try {
      let collection = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: collectionName.toString(),
        elementId: '',
      })
      if (collection.length != undefined) {
        return collection.length
      } else {
        return (`Коллекция не найдена: ${collectionName}`)
      }
    } catch (e) {
      return { error: e.message }
    }
  }
}

module.exports = Api;