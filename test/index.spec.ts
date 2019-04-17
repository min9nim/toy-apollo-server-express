import {httpServer, start, server, stop} from '../src'
import {ApolloServer, gql, PubSub} from 'apollo-server-express'
import createPubSubClient, {IPubSubClient} from './create-pubsub-client'
import {expect} from 'chai'


before(async () => {
  await start()
})

after(async () => {
  await stop()
})

describe('subscription test', () => {

  it('should successfully get data from subscription after publishing mutation', (done) => {
    let subscriptionValue = ''
    let MESSAGE = 'hello'

    const subscriptionQuery = gql`
      subscription{
        postAdded{
          author
          comment
        }
      }
    `
    const mutation = gql`
      mutation{
        addPost(author: "min", comment: "${MESSAGE}"){
          author
          comment
        }
      }
    `

    const pubSubClient: IPubSubClient = createPubSubClient(
      httpServer,
      server.subscriptionsPath,
    )

    pubSubClient.subscribe({query: subscriptionQuery}).subscribe({
      next: ({data}) => {
        subscriptionValue = data.postAdded.comment
      },
      error: (e) => {
        console.log(e)
      },
      complete: () => {
        console.log('subscribe complete')
        pubSubClient.mutate({mutation})
      },
    })

    setTimeout(async () => {
      await pubSubClient.mutate({mutation})
      expect(subscriptionValue).to.be.equal(MESSAGE)

      pubSubClient.close()
      done()
    },100)
  })

})
