import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale } from "lucide-react";
import { BRAND_NAME, UPSTREAM_ATTRIBUTION } from "@/config/brand";

export const metadata = {
    title: `Termos de Serviço | ${BRAND_NAME}`,
    description: `Termos de uso do ${BRAND_NAME}.`,
    openGraph: {
        title: `Termos de Serviço | ${BRAND_NAME}`,
        description: `Termos de uso do ${BRAND_NAME}.`,
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: `Termos de Serviço | ${BRAND_NAME}`,
        description: `Termos de uso do ${BRAND_NAME}.`,
    },
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden py-24 selection:bg-primary/30 selection:text-primary-foreground">
            {/* Ambient background glows */}
            <div className="fixed top-0 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-0 right-1/4 translate-x-1/2 translate-y-1/2 w-[30rem] h-[30rem] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="container max-w-4xl px-4 mx-auto relative z-10">

                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group">
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Voltar ao início
                </Link>

                <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Scale className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Termos de Serviço</h1>
                            <p className="text-muted-foreground mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 prose-p:leading-relaxed">

                        <p className="lead text-lg text-muted-foreground mb-8">
                            Bem-vindo ao {BRAND_NAME}. Estes termos descrevem regras gerais de uso da aplicação. O operador deve revisá-los e complementá-los antes de oferecer o serviço ao público.
                        </p>

                        <h2 className="flex items-center gap-2 mt-8 text-2xl border-b pb-2">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                            1. Segurança dos dados e responsabilidade
                        </h2>
                        <p>
                            A instalação pode ser local ou hospedada por um operador. O operador é responsável por informar como os dados são tratados, proteger a infraestrutura e cumprir as obrigações legais aplicáveis.
                        </p>
                        <ul>
                            <li><strong>Uso seguro:</strong> proteja suas credenciais e use o sistema apenas em ambientes autorizados.</li>
                            <li><strong>Dados:</strong> revise a <Link href="/privacy">Política de Privacidade</Link> e as informações do operador sobre hospedagem e retenção.</li>
                            <li><strong>Autenticação:</strong> você deve proteger as credenciais da sua conta. Não compartilhe seus dados de login com pessoas não autorizadas.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">2. Política de uso aceitável</h2>
                        <p>
                            Ao usar a API, as respostas automáticas e os recursos de transmissão do MarcFlow, você concorda em seguir os Termos de Serviço oficiais e as políticas antispam do WhatsApp. Você concorda em não:
                        </p>
                        <ul>
                            <li>Enviar mensagens de "spam" não solicitadas ou campanhas promocionais em massa para usuários que não tenham dado consentimento explícito.</li>
                            <li>Usar a plataforma para distribuir software malicioso, links de phishing ou conteúdo ilegal.</li>
                            <li>Tentar fazer engenharia reversa da API principal ou sobrecarregar o serviço com requisições em excesso.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">3. Integridade da conta</h2>
                        <p>
                            O {BRAND_NAME} oferece ferramentas para gerenciar sessões de WhatsApp. Monitore os dispositivos conectados e revogue acessos suspeitos pelo próprio WhatsApp.
                        </p>

                        <h2 className="mt-8 text-2xl border-b pb-2">4. Isenções e limitações</h2>
                        <p>
                            A aplicação depende de bibliotecas e serviços de terceiros, cujas mudanças podem afetar a disponibilidade. O usuário deve respeitar os termos e políticas do WhatsApp; a conexão não oficial pode implicar riscos de interrupção ou restrição da conta. {UPSTREAM_ATTRIBUTION}
                        </p>

                        <div className="mt-12 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                            <p className="font-semibold mb-2">Tem dúvidas sobre estes termos?</p>
                            <p className="text-sm text-muted-foreground mb-0">Consulte nossa <Link href="/docs">documentação</Link> ou entre em contato com os mantenedores do projeto para mais esclarecimentos.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
