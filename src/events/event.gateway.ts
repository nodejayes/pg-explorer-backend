import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { IBackendEvent } from '../shared/backend.event';

export interface IClientEvent {
  event: IBackendEvent;
  clientId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private connectedClient: { [key: string]: Socket } = {};
  private logger = new Logger('EventGateway');
  eventHandler = new BehaviorSubject<IBackendEvent>(null);
  emitter = new BehaviorSubject<IClientEvent>(null);

  constructor() {
    this.emitter.subscribe((event) => {
      if (!event) {
        return;
      }
      const client = this.connectedClient[event.clientId];
      if (!client) {
        this.logger.warn(`missing client with id ${event.clientId}`);
        return;
      }
      client.emit(event.event.event, event.event.data);
    });
  }

  @SubscribeMessage('event')
  event(@MessageBody() data: string, @ConnectedSocket() client: Socket): void {
    this.logger.debug(`client ${client.id} send ${data}`);
    this.eventHandler.next(JSON.parse(data) as IBackendEvent);
  }

  afterInit(server: Server): void {
    this.logger.debug('Initialized!');
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`client connected ${client.id}`);
    this.connectedClient[client.id] = client;
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`client disconnected ${client.id}`);
    delete this.connectedClient[client.id];
  }
}
