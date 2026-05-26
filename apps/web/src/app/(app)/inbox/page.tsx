import { Inbox as InboxIcon } from 'lucide-react';

export default function InboxEmptyState() {
  return (
    <div className="hidden h-full flex-col items-center justify-center bg-muted/20 p-10 text-center md:flex">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <InboxIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">Escolha uma conversa</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Selecione um chat à esquerda pra ver mensagens, assumir a conversa do agente, ou só
        acompanhar.
      </p>
    </div>
  );
}
