const Util = require('../Util.js')
const util = new Util()
const fs = require('fs')
const path = require('path')

class User {
  constructor () {
    const RealmClass = require('./Realm.js')
    const NotifClass = require('./Notification.js')

    this.notification = new NotifClass()
    this.realm = new RealmClass()
    this.jwt = require('jsonwebtoken')
    this.uuidv4 = require('uuid/v4')
  }

  // handshake
  createUser (body, isHandshake = false) {
    // console.log('isAdmin', body['isAdmin'] == 'true')
    const inputDeviceId = body.deviceId
    let inputName
    let inputEmail
    let inputPhone
    let inputRole

    if (!isHandshake) {
      inputName = body.name
      inputEmail = body.email
      inputPassword = body.password
      inputPhone = body.phone
      inputRole = body.role
    }

    let user = this.realm.base.objects('User').filtered(`deviceId = "${inputDeviceId}"`)[0]
    console.log('current user', user)
    try {
      if (user === undefined || !user.isExist) {
        console.log('here')
        user = this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          jsonValues: {
            deviceId: inputDeviceId,
            name: inputName,
            email: inputEmail,
            phone: inputPhone,
            role: inputRole
          }
        })
      }
    } catch (e) {
      return { error: e.message }
    }
    const jwtOutput = this.createToken(user.hashId)
    return ({ User: user, Token: jwtOutput })
  }

  identificateUserByToken (token, isAdminRequired = false) {
    if (isAdminRequired === 'false' || isAdminRequired === 'true') {
      isAdminRequired = (isAdminRequired === 'true')
    }
    const file = path.join(__dirname, '/../../SSL/keys/public.pem')
    const publicKey = fs.readFileSync(file)
    try {
      const decodedJWT = this.jwt.verify(token, publicKey, { algorithms: ['RS256'] })
      const tempUser = this.realm.base.objects('User').filtered(`hashId = "${decodedJWT.id}"`)[0]

      if (tempUser === undefined) {
        return { error: 'user is not found by token' }
      } else if (isAdminRequired && !tempUser.isAdmin) {
        return { error: 'user is not admin' }
      }
      return tempUser
    } catch (e) {
      return { error: e.message }
    }
  }

  sendCode (phone, isAuth = false, isAdminRequired = false) {
    const tempUser = this.realm.base.objects('User').filtered('phone ="' + phone + '"')[0]
    // console.log(tempUser)
    if (isAuth == 'true' || isAuth == 'false') isAuth = (isAuth == 'true')
    if (isAdminRequired == 'true' || isAdminRequired == 'false') isAdminRequired = (isAdminRequired == 'true')

    if (isAuth && tempUser === undefined) {
      return { error: 'Пользователь не найден' }
    }
    // console.log('user not found');
    if (!isAuth && tempUser !== undefined) {
      return { error: 'Номер уже существует' }
    }
    if (isAdminRequired && !tempUser.isAdmin) {
      return { error: 'Пользователь не администратор' }
    }
    // если уже есть записи в smsValidation с таким номером, удаляем их
    try {
      const alreadyExistingObjects = this.realm.base.objects('smsValidation').filtered(`phone = "${phone}"`)
 
      if (alreadyExistingObjects.length > 0) {
        this.realm.base.write(() => {
          for (const i in alreadyExistingObjects) {
            this.realm.base.delete(alreadyExistingObjects[i])
          }
        })
      }
    } catch (e) {
      console.log(e.message)
      console.log({ error: e.message })
    }
    // случайное число длиной в 4 цифры
    const code = (Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000).toString()

    this.realm.base.write(() => {
      this.realm.base.create('smsValidation', {
        code: code,
        phone: phone,
        hashId: this.uuidv4(),
        isExist: true
      })
    })
    return this.notification.sendSms(phone, code)
  }

  createToken (id) {
    let privateKey
    let user
    try {
      const file = path.join(__dirname, '/../../SSL/keys/private.key')
      privateKey = fs.readFileSync(file)
      user = this.realm.base.objects('User').filtered('hashId = "' + id + '"')[0]
    } catch (e) {
      return { error: e.message }
    }
    const data = {
      id: user.hashId,
      deviceId: user.deviceId,
      isAdmin: user.isAdmin
    }
    return this.jwt.sign(data, privateKey, { expiresIn: '6h', algorithm: 'RS256' })
  }
  
  changePassword (body, userHashId) {
    console.log('changePassword', body)
    const { deviceId, userHashId } = userObj
    const password = body.password
    let user = this.realm.dealWithBase({
      router: 'update',
      collectionName: 'User',
      elementId: userHashId,
      jsonValues: JSON.stringify({
        deviceId: deviceId,
        password: password,
      })
    })
    if (user.error !== undefined) return { error: 'Failed to change password'}
    return { status: 'success' }
  }
  
  // требуется проверка
  checkPassword (body) {
    console.log('checkPassword', body)
    const password = body.password
    const phone = body.phone
    const tmpUser = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'User',
      elementId: '',
      filter: `email = "${phone}" && password = "${password}" && isExist = true`
    })
    if (tmpUser[0] === undefined) {
      return { error: 'Invalid phone or password' }
    } else {
      console.log('tmpUser', tmpUser[0])
      return { User: tmpUser[0], Token: this.createToken(tmpUser[0].hashId) }
    }
  }

  checkCode(body, userObj) {
    const { deviceId, userHashId } = userObj
    if (deviceId === 'none') throw Error('lost deviceId')

    let code = body.code + ''
    let phone = body.phone
        
    // tтестовый код 
    if (code == '0000') {  
      // let smsValidationObj = this.realm.base.objects('smsValidation').filtered('phone = "'+phone+'"')[0]
      let smsValidationObj = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'smsValidation',
        elementId: '',
        filter: `phone = "${phone}" && isExist = true`
      })
      smsValidationObj = smsValidationObj[0]

      // если была регистрация по номеру phone, удалить объект 
      if (smsValidationObj != undefined ) {
        this.realm.base.write(() => {
        this.realm.base.delete(smsValidationObj)
        })
      }
    }
    // настоящая аутентификация 
    else {
      // let smsValidationObj = this.realm.base.objects('smsValidation').filtered('phone = "'+phone+'" && code = "' + code + '"')[0]
      let smsValidationObj = this.realm.dealWithBase({
        router: 'fetch',
        collectionName: 'smsValidation',
        elementId: '',
        filter: `phone = "${phone}" && code = "${code}" && isExist = true`
      })
      smsValidationObj = smsValidationObj[0]
      console.log({sms: smsValidationObj })
      // если нет такой пары, выводим ошибку 
      if (util.isUndefined(smsValidationObj)) {
        console.log('code is wrong')
        return {'error': 'code is wrong'}
      }
      // если есть, удаляем объект
      else {
        this.realm.base.write(() => {
        this.realm.base.delete(smsValidationObj)
        })
      }
    }   
    let toUpdateExistingNumber = (body['toUpdateExistingNumber'] != undefined)
   
    let tempUser = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'User',
      elementId: '',
      filter: `phone = "${phone}"`
    })
    tempUser = tempUser[0]
    if (tempUser != undefined) {
      tempUser = this.realm.dealWithBase({
        router: 'update',
        collectionName: 'User',
        elementId: tempUser.hashId,
        jsonValues: JSON.stringify({
          deviceId: deviceId,
        })
      })
    }
    // привязка нового номера с данными 
    else if (tempUser == undefined) {
      console.log({ toUpdateExistingNumber: toUpdateExistingNumber })
      if (toUpdateExistingNumber){
        // перезапись существующего номера
        tempUser = this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: userHashId,
          jsonValues: JSON.stringify({
            deviceId: deviceId,
            phone: phone
            // email: email,
          })
        })
      } else {
        tempUser = this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: '',
          jsonValues: JSON.stringify({
            deviceId: deviceId,
            phone: phone,
          })
        })
      }
    }
    // поск совпадений deviceId с другими пользователями, найденные будут 'none' 
    let filter = `deviceId = "${deviceId}" && deviceId != "none" && hashId != "${tempUser.hashId}"`
    // let anotherUsersWithSameDevice = this.realm.base.objects('User').filtered(filter)
    let anotherUsersWithSameDevice = this.realm.dealWithBase({
      router: 'fetch',
      collectionName: 'User',
      elementId: '',
      filter: filter,
    })
    console.log('anoterUserWithSameDevice', anotherUsersWithSameDevice )
     
    console.log(anotherUsersWithSameDevice)

    for (let i in anotherUsersWithSameDevice) {
      console.log('deleting deviceId')
      console.log(anotherUsersWithSameDevice[i])
      if (anotherUsersWithSameDevice[i] == undefined) continue
      else {
        this.realm.dealWithBase({
          router: 'update',
          collectionName: 'User',
          elementId: anotherUsersWithSameDevice[i].hashId,
          jsonValues: JSON.stringify({
            deviceId: 'none',
          })
        })
      }
    }
    
    return ( { 'User': tempUser, 'Token': this.createToken(tempUser.hashId) } )
  }
}
module.exports = User

