import http from 'http'
import express from 'express'
import {ApolloServer, gql, PubSub} from 'apollo-server-express'

const pubsub = new PubSub()
const PORT = 4000
const POST_ADDED = 'POST_ADDED'

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Subscription {
    postAdded: Post
  }

  type Query {
    posts: [Post]
  }

  type Mutation {
    addPost(author: String, comment: String): Post
  }

  type Post {
    author: String
    comment: String
  }
`

const db: any[] = []
const postController = {
  addPost(args) {
    db.push(args)
    return args
  },
  posts() {
    return db
  },
}

const resolvers = {
  Subscription: {
    postAdded: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => {
        return pubsub.asyncIterator([POST_ADDED])
      },
    },
  },
  Query: {
    posts(root, args, context) {
      return postController.posts()
    },
  },
  Mutation: {
    addPost(root, args, context) {
      pubsub.publish(POST_ADDED, {postAdded: args})
      return postController.addPost(args)
    },
  },
}

export const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: (ctx: any) => {
    if(ctx.connection){
      // check connection for metadata
      return ctx.connection.context
    } 
      // check from req
      const token = ctx.req.headers.authorization || ''

      return {token}
    
  },
})

const index = express()
server.applyMiddleware({app: index})
export const httpServer = http.createServer(index)
server.installSubscriptionHandlers(httpServer)

export function start() {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`)
  })
}

export function stop() {
  return new Promise(function(resolve) {
    httpServer.close(() => resolve())
  })
}

if(process.env.NODE_ENV !== 'dev'){
  start()
}


