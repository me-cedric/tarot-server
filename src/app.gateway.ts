import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
 
@WebSocketGateway()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  players: any[] = []

  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');

  @SubscribeMessage('dealCards')
  handleDealCards(): void {
    this.server.emit('dealCards');
  }

  @SubscribeMessage('cardPlayed')
  handleCardPlayed(@MessageBody() data: { sprite: string, isPlayerA: boolean }): void {
    this.logger.log('cardPlayed');
    this.server.emit('cardPlayed', data);
  }
 
  afterInit(server: Server): void {
    this.logger.log('Init');
  }
 
  handleDisconnect(client: Socket): void {
    this.logger.log(`A user disconnected: ${client.id}`);
    this.players = this.players.filter(player => player !== client.id);
  }
 
  handleConnection(client: Socket, ...args: any[]): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.players.push(client.id);
    if (this.players.length === 1) {
      this.server.emit('isPlayerA');
    }
  }
}