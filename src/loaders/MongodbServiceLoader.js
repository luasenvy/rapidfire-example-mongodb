const {
  Interfaces: { ServiceLoader },
} = require('@luasenvy/rapidfire')

const { MongoClient } = require('mongodb')

class MongodbServiceLoader extends ServiceLoader {
  constructor() {
    super()
  }

  load({ express, Service: MongodbService }) {
    const mongoClient = this.$rapidfire.dbs.find(db => db instanceof MongoClient)
    const db = mongoClient.db('rapidfire')

    const collection = (MongodbService.collections || []).reduce((acc, collection) => Object.assign(acc, { [`${collection}`]: db.collection(collection) }), {})

    // Chunk By 512KB
    const bucket = (MongodbService.buckets || []).reduce((acc, bucketName) => {
      const bucketClient = new GridFSBucket(db, { chunkSizeBytes: 512 * 1024, bucketName })
      return Object.assign(acc, {
        [`${bucketName}`]: Object.assign(bucketClient, {
          files: db.collection(`${bucketName}.files`),
          chunks: db.collection(`${bucketName}.chunks`),
        }),
      })
    }, {})

    const service = new MongodbService({ collection, bucket, router: express.Router() })

    service.$rapidfire = this.$rapidfire
    service.controller = this.$rapidfire.controllers.find(controller => controller instanceof MongodbService.controller)

    return service
  }
}

module.exports = MongodbServiceLoader
