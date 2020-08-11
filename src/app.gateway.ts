import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Socket, Server } from 'socket.io'

class Player {
  id: string
  name?: string
  lobby?: string
}

class Game {
  public started = false
  public creatorId: string
  public roomName: string
  private cards: number[]
  public players: { [key: string]: any } = {}

  constructor(creatorId: string, roomName: string) {
    this.creatorId = creatorId
    this.roomName = roomName
    this.cards = [...Array(22).keys()]
  }
}

@WebSocketGateway()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private players: { [key: string]: Player } = {}

  private games: { [key: string]: Game } = { a: new Game('aze', 'eza') }

  @WebSocketServer() server: Server
  private logger: Logger = new Logger('AppGateway')

  @SubscribeMessage('dealCards')
  dealCards(): void {
    this.server.emit('dealCards')
  }

  @SubscribeMessage('cardPlayed')
  cardPlayed(client: Socket, data: string): void {
    this.logger.log('cardPlayed')
    this.server.emit('cardPlayed', { sprite: data, player: this.players[client.id] })
  }

  @SubscribeMessage('setUser')
  setUser(client: Socket, data: string): void {
    this.logger.log(`setUser: ${data}`)
    Object.keys(this.players).forEach((playerId: string) => {
      if (playerId === client.id) {
        this.players[playerId].name = data
        client.emit('user', this.players[playerId])
      }
    })
  }

  @SubscribeMessage('createRoom')
  createRoom(@MessageBody() data: string, @ConnectedSocket() client: Socket): void {
    this.logger.log('createRoom')
    this.games[client.id] = new Game(client.id, data)
    this.server.to(client.id).emit('gameJoined', this.games[client.id])
    this.games[client.id].players[client.id] = {}
    this.server.to(client.id).emit('playerUpdate', this.games[client.id].players)
    this.logger.log(this.server.sockets.adapter.rooms)
    this.server.emit('roomCreated', client.id)
  }

  @SubscribeMessage('joinRoom')
  joinRoom(@MessageBody() data: string, @ConnectedSocket() client: Socket): void {
    this.logger.log('joinRoom')
    client.leaveAll()
    client.join(data, err => {
      if (err) {
        this.logger.error(err)
        client.emit('joinFailed')
      } else {
        this.server.to(client.id).emit('gameJoined', this.games[client.id])
        this.games[data].players[client.id] = {}
        this.server.to(client.id).emit('playerUpdate', this.games[client.id].players)
        this.logger.log(this.server.sockets.adapter.rooms)
      }
    })
  }
 
  afterInit(server: Server): void {
    this.logger.log('Init')
  }
 
  handleDisconnect(client: Socket): void {
    this.logger.log(`A user disconnected: ${client.id}`)
    delete this.players[client.id]
  }
 
  handleConnection(client: Socket, ...args: any[]): void {
    this.logger.log(`Client connected: ${client.id}`)
    this.players[client.id] = { id: client.id }
    this.server.emit('clientConnected', this.players)
  }
}