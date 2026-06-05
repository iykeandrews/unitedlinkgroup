import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class NotificationsStreamService {
  // Map of userId to Subject for pushing SSE events
  private streams = new Map<string, Subject<MessageEvent>>();

  // Get or create the subject for a user
  getUserStream(userId: string): Subject<MessageEvent> {
    let subject = this.streams.get(userId);
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.streams.set(userId, subject);
    }
    return subject;
  }

  // Emit a push event to a specific user
  emitToUser(userId: string, data: any) {
    const subject = this.streams.get(userId);
    if (subject) {
      subject.next({ data });
    }
  }
}
