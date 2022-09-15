import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesWsService } from './messages-ws.service';
import { NewMessageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces';

@WebSocketGateway({ cors: true })
export class MessagesWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      return;
    }

    console.log({ payload });

    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnectedClients(),
    );

    // client.join('ventas');
    // client.join(client.id); // Todos están conectados por default
    // client.join(user.email); // Como identificador de sala, prueba
    // this.wss.to('ventas').emit('hola');
  }

  handleDisconnect(client: Socket) {
    this.messagesWsService.removeClient(client.id);
    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnectedClients(),
    );
  }

  @SubscribeMessage('message-from-client')
  onMessageFromClient(client: Socket, payload: NewMessageDto) {
    // Emitir a TODOS los clientes
    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getUserFullNameBySocketId(client.id),
      message: payload.message || 'no-message',
    });

    // Emite ÚNICAMENTE al cliente que lanzó el evento
    // client.emit('message-from-server', {
    //   fullName: 'Betan',
    //   message: payload.message || 'no-message',
    // });

    // Emitir a todos MENOS AL CLIENTE que lanzó el evento
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'Betan',
    //   message: payload.message || 'no-message',
    // });
  }
}
