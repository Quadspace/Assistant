declare module 'extended-eventsource' {
  export class EventSource {
    constructor(url: string, options: any);
    onmessage: (event: any) => void;
    onerror: (error: any) => void;
    close: () => void;
  }
}
