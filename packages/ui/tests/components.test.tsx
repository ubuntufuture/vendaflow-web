import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge, Button, Checkbox, Field, StateView, Toast, Wordmark } from '../components/primitives';
import { ComponentGallery, Screen } from '../screens';
import tokens from '../../../branding/tokens.json';

describe('Semântica e comportamento dos componentes',()=>{
  it('mantém a marca e os tokens exatos do contrato UI',()=>{
    expect(tokens.primitive).toEqual({primary:'#FF6A4D',foreground:'#0B0E14',background:'#FFF9F6',surface:'#FFFFFF',muted:'#E6E8EC'});
    render(<Wordmark />);expect(screen.getByLabelText('Venda Flow AI')).toBeInTheDocument();
  });
  it('não permite duplicar ação pelo botão ocupado',async()=>{
    const handler=vi.fn();render(<Button busy onClick={handler}>Enviando</Button>);
    await userEvent.click(screen.getByRole('button'));expect(handler).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy','true');
  });
  it('associa rótulo, ajuda e erro ao campo sem depender de cor',()=>{
    render(<Field label="Nome" hint="Informe um nome" error="Nome obrigatório" />);
    const input=screen.getByRole('textbox',{name:'Nome'});
    expect(input).toHaveAttribute('aria-invalid','true');
    expect(input).toHaveAccessibleDescription('Informe um nome Nome obrigatório');
  });
  it('não marca consentimento opcional por padrão',async()=>{
    render(<Checkbox label="Receber ofertas por WhatsApp" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await userEvent.click(screen.getByLabelText('Receber ofertas por WhatsApp'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
  it.each(['loading','empty','error','forbidden','timeout','success','stale'] as const)('representa estado %s com texto acessível',state=>{
    render(<StateView state={state} />);expect(document.body.textContent!.length).toBeGreaterThan(15);
    if(state==='loading')expect(screen.getByRole('status')).toHaveAttribute('aria-busy','true');
    if(state==='error')expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });
  it('timeout oferece consulta e nunca declara a operação paga',async()=>{
    const handler=vi.fn();render(<StateView state="timeout" onRetry={handler} />);
    await userEvent.click(screen.getByRole('button',{name:'Consultar estado'}));expect(handler).toHaveBeenCalledOnce();
    expect(document.body).not.toHaveTextContent('Pagamento aprovado');
  });
  it('feedback é dispensável pelo usuário',async()=>{
    const dismiss=vi.fn();render(<Toast onDismiss={dismiss}>DEMO_ONLY · revisão concluída</Toast>);
    expect(screen.getByRole('status')).toHaveTextContent('DEMO_ONLY');
    await userEvent.click(screen.getByRole('button',{name:'Dispensar notificação'}));expect(dismiss).toHaveBeenCalledOnce();
  });
  it('badge explica o estado mesmo sem cores',()=>{render(<Badge tone="error" icon="warning">Falha de consulta</Badge>);expect(screen.getByText('Falha de consulta')).toBeVisible();});
  it('retorno de cobrança não ativa assinatura nem oferece pagar novamente',()=>{
    render(<Screen routeId="APP23" />);
    expect(screen.getByText('Aguardando confirmação')).toBeVisible();
    expect(screen.queryByText('Pagamento aprovado')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Consultar confirmação'})).toBeDisabled();
  });
  it('console interno tem contexto separado do cliente',()=>{
    render(<Screen routeId="ADM03" />);expect(screen.getByRole('navigation',{name:'Navegação administrativa'})).toBeVisible();
    expect(screen.queryByRole('navigation',{name:'Navegação do cliente'})).not.toBeInTheDocument();
  });
  it('páginas sem dados não inventam preços ou contagens',()=>{
    render(<Screen routeId="APP02" />);
    expect(screen.getAllByText('Sem dados confirmados')).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(/R\$\s*\d|99[.,]4|284[.,]350/);
  });
  it('filtros alternam estado por interação de usuário',()=>{
    render(<Screen routeId="APP05" />);const button=screen.getByRole('button',{name:'Meus contatos'});
    fireEvent.click(button);expect(button).toHaveAttribute('aria-pressed','true');
  });
  it('fila de conversas tem uma única busca sem campos redundantes',()=>{
    render(<Screen routeId="APP03" />);expect(screen.getAllByRole('searchbox')).toHaveLength(1);
  });
  it('catálogo identifica exemplos de feedback como DEMO_ONLY',()=>{
    // Diálogo nativo é coberto no navegador real, não por polyfill em jsdom.
    render(<ComponentGallery />);expect(screen.getByText(/catálogo de componentes sem operações externas/)).toBeVisible();
  });
});
