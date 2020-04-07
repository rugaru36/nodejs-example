/*
	npm i --save express realm pm2 jsonwebtoken uuid body-parser jade cookie sharp express-fileupload cookie-parser socket.io axios md5
*/

const portHttp		= 80
const express		= require('express')
const app			= express()
const bodyParser		= require('body-parser')
const Enum			= require('../Utils/Enum.js')
const fileUpload 	= require('express-fileupload')
const sharp 			= require('sharp')
const fs				= require('fs')
const uuidv4			= require('uuid/v4')
const cookieParse 	= require('cookie-parser')
const cors 			= require('cors')
const server 		= require('http').Server(app)
const io 			= require('socket.io')(server)
const axios 			= require('axios')
const fs 			= require('fs')
const NotifClass		= require('../Utils/Classes/Notification.js')
const Api			= require('../Utils/Classes/Api.js')
const Realm			= require('../Utils/Classes/Realm.js')
const User			= require('../Utils/Classes/User.js')
const methods = require('../Utils/methods.json')

const notification 	= new NotifClass()
const realm			= new Realm()
const user			= new User()
const api 			= new Api()

var sockets 		= []
var config 	= realm.getConfig()

app.use(express.static(__dirname + '/../', { dotfiles: 'allow' } ))

server.listen(portHttp, function(){
	console.log('Listening to port ' + portHttp + '!')
})

app.set('views', __dirname + '/../Public')
app.set('view engine', 'jade')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(fileUpload())
app.use(cors())

app.use(cookieParse())

app.use(express.static(__dirname + '/../Uploads/'))
app.use(express.static(__dirname + '/../Public/'))

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	next()
})

//обновление базы
app.post('/database', function (req, res) {
	let token = req.headers['x-access-token']
	//идентифицируем юзера
	try{
		let identificationResult = user.identificateUserByToken(token)
		if(identificationResult.error != undefined){
			return res.json(identificationResult)
		}
		//запрос в базу
		return res.json(realm.dealWithBase(req.body))
	}catch(error){
		console.log(error.message)
		return res.json({'error':error.message})
	}
})

app.post('/api', function (req, res) {
	let router = req.body['router']
	if(router == '' || router == undefined) {
		return res.json({'error':'router is undefined'})
	}
	let token = req.headers['x-access-token']
	let userObj
	let deviceId
	let identificationResult

	if (token == undefined) {
		return res.json({'error':'no token found'})
	} else {
		identificationResult = user.identificateUserByToken(token)
		if (identificationResult.error != undefined) {
			return res.json(identificationResult)
		} else {
			userObj = identificationResult
			deviceId = userObj.deviceId
			userHashId = userObj.hashId
		}
	}
	switch(router) {
		case 'sendPushMessages':
			try{
				let role = body['role']
				let users = realm.dealWithBase({
					router: 'fetch',
					collectionName: 'User',
					elementId: '',
					filter: `role = \"${role}\" && fcmToken != \"\"`
				})
				for(let i in users){
					notification.sendPush(users[i].fcmToken, 'Тук-тук', text)
				}
				return res.json({status:'success'})
			}catch(e){
				return res.json({error: e.message})
			}
		case 'createOrder':
			try {
				let order = api.createOrder(req.body, userHashId, config)
				const orderHashId = order.hashId 
				const token = 'v0fv0h6qbfioi8ctara99ae99u'
				const amount = order.price * 100
				const orderNum = order.orderNum
				const returnUrl = 'http://45.141.102.83/api/payment?orderHashId=' + order.hashId + '&userHashId=' + userHashId
				const failUrl = 'http://45.141.102.83/api/paymentFail?orderHashId=' + order.hashId + '&userHashId=' + userHashId
				const dataToSber = {
					'amount'			: amount,
					'orderNumber'	: orderNum,
					'returnUrl'		: returnUrl,
					'failUrl'			: failUrl,
					'token'				: token,
				}
				const urlDataToSber 	= Object.entries(dataToSber).map(e => e.join('=')).join('&')
				axios.post('https://3dsec.sberbank.ru/payment/rest/register.do', urlDataToSber)
				.then(response => {
					if(response.data.errorCode != undefined) {
						return res.json({'error':response.data.errorMessage})
					}
					console.log(response.data)
					return res.json({'formUrl': response.data.formUrl})
					})
				.catch(response => {
					return res.json({'error': response.message})
				})
			} catch(e) {
				return res.json({'error': e.message})
			}
		break
		case 'createInvite':
			try {
				return res.json(api.createInvite(userHashId))
			} catch(e) {
				return res.json({ error: e.message })
			}
		case 'activateInvite':
			try {
				const activateInvite = api.activateInvite(req.body)
				const userWhoInvites = activateInvite.userWhoInvites
				if (activateInvite.error === undefined ) {
					let isUserInSocket = false
					for (const i in sockets) {
						if (sockets[i].user.hashId === userWhoInvites) {
							io.to(sockets[i].socket.id).emit('inviteWasTaken')
							isUserInSocket = true
							break
						} 
					}
					if (isUserInSocket !== true) {
						realm.dealWithBase({
							router: 'update',
							collectionName: 'User',
							elementId: userWhoInvites,
							jsonValues: JSON.stringify({
								isInviteTaken: true,
							})
						})
					}	
				}
				return res.json({ status: 'success' })
			} catch(e) {
				return res.json({ error: e.message })
			}
		break
		case 'phoneAuth':
			console.log(req.body)
			try {
				return res.json(api.phoneAuth(req.body))
			} catch(e) {
				return res.json({ error: e.message })
			}
		break

		case 'codeCheck':
			// console.log({"USER": userHashId})
			try {			
				let userObj = { deviceId: deviceId, userHashId: userHashId} 
				let result = api.codeCheck(req.body, userObj)
				
				if(result.error == undefined){
          let token = result.Token
          res.cookie('token', token, {
            expires: new Date(Date.now() + 21600000),
          })
          return res.json(result)
        }
        else return res.json(result)
			} catch(e) {
				return res.json({'error': e.message})
			}
		break
		case 'mainLoad':
			try{
				console.log(req.headers['x-access-token'])
				console.log(userHashId)
				return res.json(api.mainLoad(req.body, userObj));
			}
			catch(e){
				return res.json({'error': e.message});
			}
		break;
		break
		case 'getCollectionSize':
			try{
				return res.json(api.getCollectionSize(req.body))
			} catch(e){
				return res.json({error: e.message})
			}
		break
		default:
			return res.json({'error':'wrong router'})	
  }
})

//создаёт нового пользователя
app.post('/handshake', function (req, res) {
	try{

		return res.json(user.createUser(req.body/*, true*/))
	} catch(e){
		return res.json({'error': e.message})
	}
})

//Рождалось в мучениях, но работает.
app.post('/uploadimage', function(req, res) {

	let file = req.files.file
	let fileName = file.name
	let fileType = fileName.split('.').pop()
	let uploadedFileName = `temp${Date.now()}.${fileType}`
	let imageCode = uuidv4() + ''
	let outputFileName = `${imageCode}.${fileType}`

	file.mv(`${__dirname}/../Uploads/${uploadedFileName}`, function(err) {
		if (err) {
			return res.json(err)
		}
		try {
			//preview
			sharp(`${__dirname}/../Uploads/${uploadedFileName}`)
				.resize(256)
				.withMetadata()
				.toFile(`${__dirname}/../Uploads/Image/Preview/${outputFileName}`)
				.then(info => { 
					//original
					sharp(`${__dirname}/../Uploads/${uploadedFileName}`)
						.resize( 800 )
						.withMetadata()
						.toFile(`${__dirname}/../Uploads/Image/Original/${outputFileName}`)
						.then(info => { 
							//были проблемы, оставил 3000 на всякий пожарный
							setTimeout(() => {
								fs.unlinkSync(`${__dirname}/../Uploads/${uploadedFileName}`)
							}, 3000)
						})
						.catch(err => {
							return res.json({'error': err.message})
						})
					})
				.catch(err => {
					return res.json({'error': err.message})
				})
		} catch(e) {
				return res.json( {'error': e.message })
		}
	})

const previewPath  = 'http://45.141.102.83/Image/Preview/'
const originalPath = 'http://45.141.102.83/Image/Original/'
let data = {
	router: 'update', 
	collectionName: 'Image', 
	elementId: imageCode, 
	jsonValues : JSON.stringify({
		preview	 : `${previewPath}${outputFileName}`,
		original : `${originalPath}${outputFileName}`
		})
	}				
	
	try {
		return res.json(realm.dealWithBase(data))
	} catch(e) {
		return res.json({'error': e.message})
	}
})

app.post('/uploadaudio', function(req, res) {
	if (Object.keys(req.files).length == 0) {
    return res.status(400).send('Нет файлов для загрузки')
  }
	console.log(req.files)
	let file = req.files.file
	let fileName = file.name
	let fileType = fileName.split('.').pop()
	let trackHashId = uuidv4() + ''
	let outputFileName = `${trackHashId}.${fileType}`
	let types = ['aac','flac','m4a','mp3','mp4','raw','wav','wma']
	try {
		let index = types.indexOf(fileType)
		if (index !== -1 ) {
			file.mv(`${__dirname}/../Uploads/Audio/${outputFileName}`, function(err) {
				if (err) {
					return res.status(500).send.json(err)
				}
			})
		}
	} catch(e) {
			return res.json({'error': e.message})
	}	
	const filePath = 'http://45.141.102.83/Audio/' 
	let data = {
		router:'update', 
		collectionName:'Audio', 
		elementId: trackHashId, 
	  jsonValues: JSON.stringify({
			file: `${filePath}${outputFileName}`,
			sourceName: fileName,
		})
	}

	try {
		return res.json(realm.dealWithBase(data))
	} catch(e){
		return res.json({'error': e.message})
	}
})

app.all('/scheme', function(req, res) {
	res.json({'schema':realm.getSchema(), 'enum': Enum})
})

app.all('/enum', function(req, res) {
	res.json({'enum': Enum})
})

app.all('/methods', function(req, res) {
	res.json({'methods': methods})
})

app.all('/login', function(req, res){
	let config = {
		page: 'login',
		keywords: 'keywords',
		descriptions: '',
		title: 'Login'
	}
	res.render('index', {_config: config})
})

app.all('/', function(req, res){
	let config = {
		page: 'login',
		keywords: 'keywords',
		descriptions: '',
		title: 'Login'
	}
})

app.get('/admin', function (req, res) {
  const tokenFromCookies = req.cookies.token
  if (tokenFromCookies === undefined) {
    console.log('cookies are not defined')
    const config = {
      page: 'login',
      keywords: 'keywords',
      descriptions: '',
      title: 'Login'
    }
    return res.render('index', { _config: config })
  }
  if (user.identificateUserByToken(tokenFromCookies).error === undefined) {
    if (user.identificateUserByToken(tokenFromCookies).role === 'admin') {
      const config = {
        page: 'admin',
        keywords: 'keywords',
        descriptions: '',
        title: 'Admin'
      }
      return res.render('index', { _config: config })
    }
    return res.redirect('/login')
  } else {
    console.log(user.identificateUserByToken(tokenFromCookies))
    const config = {
      page: 'login',
      keywords: 'keywords',
      descriptions: '',
      title: 'Login'
    }
    return res.render('index', { _config: config })
  }
})

// сюда приходит ответ от сбера
app.get('/api/payment', function(req, res) {
	try {
		console.log({'REQ': req.query})
		let orderHashId = req.query.orderHashId	
		let order = realm.dealWithBase({
			router: 'fetch',
			collectionName: 'Order',
			elementId: orderHashId,
		}) 
		let userHashId = order.userHashId
		console.log(order)
		if (order.error != undefined) throw new Error('order not found')
		const type = order.__type
		// если тип покупки VIP на 3 или 6 или 12 месяцев
		// сумма из времени доступа и даты покупки в секундах
		const avaliableTime = +order.avaliableTime
		const updatedTime = +order.updated
		const accessTo = avaliableTime + updatedTime
		if (type == 'vipAccess3M' || type == 'vipAccess6M' || type == 'vipAccess12M') {
			realm.dealWithBase({
				router: 'update',
				collectionName: 'User',
				elementId: order.userHashId,
				jsonValues: JSON.stringify({
					vipAccessTo: accessTo
				})
			})
		}
		realm.dealWithBase({
			router: 'update',
			collectionName: 'Order',
			elementId: orderHashId,
			jsonValues: JSON.stringify({
				status: 'accepted',
				avaliableTime: accessTo
			})
		})
		for(let i in sockets) {
			if(sockets[i].user.hashId == userHashId) {
				io.to(sockets[i].socket.id).emit('orderCheck', order)
			}
		}
		
		return res.json({status: 'success'})
	} catch(e) {
		console.log({'error':e.message})
		return res.json({'error':e.message})
	}
})

app.get('/api/paymentFail', function(req, res) {
	try {
		console.log({'REQ': req.query})
		let order = realm.dealWithBase({
			router: 'update',
			collectionName: 'Order',
			elementId: req.query.orderHashId,
			jsonValues: JSON.stringify({
				status: 'cancelled'
			})
		})
		let userHashId = order.userHashId
		for(let i in sockets) {
			if(sockets[i].user.hashId == userHashId) {
				io.to(sockets[i].socket.id).emit('orderFailed')
			}
		}
		return res.json({status: 'aborted'})
	} catch(e) {
		console.log({'error':e.message})
		return res.json({'error':e.message})
	}
})

app.all('*', function (req, res) {
	res.json({error: 'Router is wrong'})
})

io.on('connection', function (socket) {
	try{	
    function forceClose() {
        console.log('user disconnected')
        socket.disconnect()
    }
		var authResult
		socket.on('registration', function (data) {
			console.log(data)
			if (data.token == undefined) {
        forceClose()
      } else {
        authResult = user.identificateUserByToken(data.token)
				if(authResult.error == undefined){
					for(let i in sockets){
						if(sockets[i].user.hashId == authResult.hashId){
							io.to(sockets[i].socket.id).emit('sameUserConnected')
							sockets[i].socket.disconnect()
							sockets.splice(i,1)
						}
					}
					sockets.push({socket:socket, user: authResult})
        } else {
          forceClose()
        }
      }
    })
		socket.on('disconnect', function(){
			for(let i in sockets){
				if(authResult == undefined) break
				if(sockets[i].user.hashId == authResult.hashId){
					sockets.splice(i,1)
				}
			}
		})
	}catch(e){
		console.log(e.message)
	}
})
