import {InMemoryCache} from 'apollo-cache-inmemory'
import {ApolloClient, MutationOptions, SubscriptionOptions} from 'apollo-client'
import {Observable} from 'apollo-client/util/Observable'
import {FetchResult} from 'apollo-link'
import {WebSocketLink} from 'apollo-link-ws'
import http, {Server} from 'http'
import {AddressInfo} from 'net'
import {SubscriptionClient} from 'subscriptions-transport-ws'
import {format} from 'url'
import NodeWebSocket from 'ws'

export interface IServerInfo {
  address: string
  family: string
  url: string
  subscriptionsUrl: string
  port: number | string
  subscriptionsPath: string
  server: http.Server
}

export interface IPubSubClient {
  subscribe(options: SubscriptionOptions): Observable<any>
  mutate(options: MutationOptions): Promise<FetchResult>
  close(isForced?: boolean, closedByUser?: boolean): void
}

/**
 * Referenced from https://bit.ly/2UadwpO
 */
export default function createPubSubClient(
  server: Server,
  subscriptionsPath?: string,
  ): IPubSubClient {
  const {subscriptionsUrl}: IServerInfo = createServerInfo(server, subscriptionsPath)
  const subscriptionClient = new SubscriptionClient(
    subscriptionsUrl,
    {reconnect: true},
    NodeWebSocket,
  )
  const apolloClient = new ApolloClient({
    link: new WebSocketLink(subscriptionClient),
    cache: new InMemoryCache(),
  })
  return {
    subscribe: (options) => apolloClient.subscribe(options),
    mutate: (options) => apolloClient.mutate(options),
    close: () => subscriptionClient.close(),
  }
}

/**
 * Referenced from https://bit.ly/2FLv9Sz
 */
function createServerInfo(
  server: http.Server,
  subscriptionsPath?: string,
): IServerInfo {
  const serverInfo: any = {
    ...server.address() as AddressInfo,
    server,
    subscriptionsPath,
  }

  // Convert IPs which mean "any address" (IPv4 or IPv6) into localhost
  // corresponding loopback ip. Note that the url field we're setting is
  // primarily for consumption by our test suite. If this heuristic is
  // wrong for your use case, explicitly specify a frontend host (in the
  // `frontends.host` field in your engine config, or in the `host`
  // option to ApolloServer.listen).
  let hostForUrl = serverInfo.address
  if(serverInfo.address === '' || serverInfo.address === '::'){
    hostForUrl = 'localhost'
  }

  serverInfo.subscriptionsUrl = format({
    protocol: 'ws',
    hostname: hostForUrl,
    port: serverInfo.port,
    slashes: true,
    pathname: subscriptionsPath,
  })

  return serverInfo
}
