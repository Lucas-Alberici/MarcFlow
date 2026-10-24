import Link from "next/link";
import { ArrowLeft, Lock, Shield } from "lucide-react";
import { BRAND_INSTAGRAM_URL, BRAND_NAME, UPSTREAM_ATTRIBUTION } from "@/config/brand";

export const metadata = {
    title: `Política de Privacidade | ${BRAND_NAME}`,
    description: `Informações sobre o tratamento de dados no ${BRAND_NAME}.`,
    openGraph: {
        title: `Política de Privacidade | ${BRAND_NAME}`,
        description: `Informações sobre o tratamento de dados no ${BRAND_NAME}.`,
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: `Política de Privacidade | ${BRAND_NAME}`,
        description: `Informações sobre o tratamento de dados no ${BRAND_NAME}.`,
    },
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden py-24 selection:bg-primary/30 selection:text-primary-foreground">
            {/* Ambient background glows */}
            <div className="fixed top-0 right-1/4 translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-0 left-1/4 -translate-x-1/2 translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="container max-w-4xl px-4 mx-auto relative z-10">

                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group">
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Voltar ao início
                </Link>

                <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Shield className="h-8 w-8 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Política de Privacidade</h1>
                            <p className="text-muted-foreground mt-2">Data de vigência: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 prose-p:leading-relaxed">

                        <p className="lead text-lg text-muted-foreground mb-8">
                            Esta política descreve os dados tratados pelo {BRAND_NAME}. O local de processamento depende de como e onde a aplicação foi instalada; antes de disponibilizar o serviço publicamente, o responsável pela operação deve preencher os dados de contato e os fornecedores efetivamente utilizados.
                        </p>

                        <h2 className="flex items-center gap-2 mt-8 text-2xl border-b pb-2">
                            <Lock className="h-6 w-6 text-blue-500" />
                            1. Dados e armazenamento
                        </h2>
                        <p>
                            O sistema pode processar dados de conta, configurações, mensagens, contatos, arquivos de mídia e credenciais de sessão do WhatsApp para fornecer seus recursos. Em uma instalação local, esses dados são armazenados nos serviços configurados pelo operador. Em uma implantação hospedada, eles também podem ser processados pelo provedor de hospedagem, pelo banco de dados e por outros fornecedores habilitados pelo operador.
                        </p>
                        <ul>
                            <li><strong>Credenciais:</strong> as senhas do painel são armazenadas com hash; credenciais de sessão do WhatsApp devem ser tratadas como segredos.</li>
                            <li><strong>Operação hospedada:</strong> o operador deve informar aos usuários quais provedores, regiões e prazos de retenção são aplicáveis antes de abrir o serviço ao público.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">2. Serviços de terceiros</h2>
                        <p>
                            O funcionamento pode envolver:
                        </p>
                        <ul>
                            <li><strong>WhatsApp/Meta:</strong> a biblioteca Baileys estabelece a conexão com o WhatsApp; o uso também está sujeito às políticas da Meta.</li>
                            <li><strong>Hospedagem e banco:</strong> provedores escolhidos pelo operador podem processar requisições, logs e dados persistidos.</li>
                            <li><strong>Integrações opcionais:</strong> webhooks e serviços externos configurados pelo operador podem receber os dados enviados a eles.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">3. Protegendo suas informações</h2>
                        <p>
                            O operador deve proteger a infraestrutura e as credenciais, usar HTTPS, limitar acessos, manter backups protegidos e definir retenção e resposta a incidentes. A conexão de WhatsApp não deve ser habilitada em uma implantação sem armazenamento persistente e proteção adequada dos segredos.
                        </p>
                        <ul>
                            <li>Usar HTTPS e controles de acesso apropriados.</li>
                            <li>Armazenar segredos em um gerenciador seguro e limitar privilégios.</li>
                            <li>Manter backups, atualizações e um prazo de retenção documentado.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">4. Integrações de terceiros</h2>
                        <p>
                            {BRAND_NAME} usa a biblioteca <code>@whiskeysockets/baileys</code> para se comunicar com o WhatsApp. O processamento no WhatsApp continua sujeito aos termos e à política de privacidade da Meta.
                        </p>

                        <div className="mt-12 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                            <p className="font-semibold mb-2">Precisa de mais detalhes?</p>
                            <p className="text-sm text-muted-foreground mb-0">Contato do projeto: <Link href={BRAND_INSTAGRAM_URL}>Instagram @eumsml7</Link>. {UPSTREAM_ATTRIBUTION}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
