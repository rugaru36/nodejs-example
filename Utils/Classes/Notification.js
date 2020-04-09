const smsc = require('../smsc_api.js');
// const FCM       = require('fcm-node');
// let serverKey   = require('../FCMServerCode.js');
// const fcm       = new FCM(serverKey);

smsc.configure({
  login: '####',
  password: '####',
});

smsc.test(function (err) {
  if (err) return console.log('error: ' + err);
  console.log('connection to smsc completed!');
});

class Notification {
  sendSms(phone, text) {
    try {
      smsc.send_sms({
        list: {
          [phone]: text + '',
        }
      }, function (data, raw, err, code) {
        if (err) {
          console.log(err, 'code: ' + code);
          return { 'error': err + ' code: ' + code };
        }
        console.log(data); // object
      });
      return { 'status': 'success' };
    } catch (e) {
      return { 'error': e.message };
    }
  }

  sendEmail(email, message, subject, sender) {
    try {
      console.log(arguments);
      smsc.send('mail', {
        phones: email,
        mes: message,
        subj: subject,
        sender: sender,
      }, function (data, raw, err, code) {
        console.log(raw);
        if (err) return console.log(err, 'code: ' + code);
      });
    } catch (e) {
      return { 'error': e.message };
    }
  }

  sendPush(token, title, body) {

    let message = {
      to: token,
      notification: {
        title: title,
        body: body
      },
    };

    fcm.send(message, function (err, response) {
      if (err) {
        console.log({ 'error': err });
      } else {
        console.log({ 'response': response });
      }
    })
  }
}
module.exports = Notification
