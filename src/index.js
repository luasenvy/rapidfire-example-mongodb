const path = require('path')

const { Logger, MongoClient } = require('mongodb')

const { RapidFire } = require('@luasenvy/rapidfire')

const constants = {
  mongodb: {
    uri: 'mongodb://172.30.1.2:27017',
    options: { useUnifiedTopology: true },
  },
}

const fn = {
  gracefulShutdown({ err, mongoClient, eventName }) {
    if (err) console.error(err)

    if (mongoClient && mongoClient.close instanceof Function) {
      try {
        console.debug(`[${eventName}] Database Will Be Close.`)
        mongoClient.close()
      } catch (err) {
        console.error(err)
      }
    }

    process.exit(0)
  },
}

async function main() {
  // Create a new MongoClient
  const mongoClient = new MongoClient(constants.mongodb.uri, constants.mongodb.options)

  try {
    // ------------------------ Database Connection
    await mongoClient.connect()

    consola.ready(`Database Connected To ${constants.mongodb.uri}`)
    Logger.setLevel('info')

    const rapidFire = new RapidFire({
      host: 'localhost',
      port: 8000,
      paths: {
        loaders: path.join(__dirname, 'loaders'),
        services: path.join(__dirname, 'services'),
      },
      dbs: [mongoClient],
    })

    try {
      // 비정상 종료시 자동 close 진행
      process.on('exit', err => fn.gracefulShutdown({ err, mongoClient, eventName: 'exit' }))
      process.on('SIGINT', err => fn.gracefulShutdown({ err, mongoClient, eventName: 'SIGINT' }))
      process.on('SIGTERM', err => fn.gracefulShutdown({ err, mongoClient, eventName: 'SIGTERM' }))
      process.on('uncaughtException', err => fn.gracefulShutdown({ err, mongoClient, eventName: 'uncaughtException' }))
      process.on('SIGKILL', err => fn.gracefulShutdown({ err, mongoClient, eventName: 'SIGKILL' })) // nodemon처럼 SIGKILL 명령에 의해 종료될 때
    } catch (err) {
      // process.on('SIGKILL') 을 사용할 때 uv_signal_start EINVAL 오류가 throws될 수 있음.
      if (err.code !== 'EINVAL') {
        console.error(err)
        return fn.gracefulShutdown({ err, mongoClient, eventName: err.code })
      }
    }

    rapidFire.ignition()
  } catch (err) {
    if (mongoClient && mongoClient.close instanceof Function) {
      try {
        mongoClient.close()
      } catch (err) {
        console.error(err)
      }
    }
    console.error(err)
  }
}

main()
