"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { ArrowRight, Braces, Eye, EyeOff, Lock, User } from "lucide-react";
import { M7Logo } from "@/components/brand/m7-logo";
import { BRAND_NAME, BRAND_TAGLINE, UPSTREAM_URL } from "@/config/brand";
import Link from "next/link";

export default function ApiDocsPage() {
    const { status, update } = useSession();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const swaggerEnabled = process.env.NEXT_PUBLIC_SWAGGER_ENABLED === "true";

    useEffect(() => {
        // Suppress Swagger UI legacy lifecycle warnings (ModelCollapse)
        const originalWarn = console.warn;
        console.warn = (...args) => {
            if (typeof args[0] === 'string' &&
                args[0].includes('UNSAFE_componentWillReceiveProps') &&
                args[0].includes('ModelCollapse')) {
                return;
            }
            originalWarn(...args);
        };

        return () => {
            console.warn = originalWarn;
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const result = await signIn("credentials", {
                redirect: false,
                email: username,
                password,
            });
            if (!result?.ok) {
                setError("E-mail ou senha inválidos");
                return;
            }
            await update();
        } catch {
            setError("Não foi possível autenticar. Tente novamente.");
        }
    };

    const handleLogout = async () => {
        await signOut({ redirect: false });
        setUsername("");
        setPassword("");
    };

    if (!swaggerEnabled) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B111C] px-6 text-center text-slate-100">
                <M7Logo className="h-14 w-14" />
                <h1 className="text-2xl font-bold">Documentação interativa desativada</h1>
                <p className="max-w-lg text-slate-400">O Swagger está desativado nesta instalação. Consulte a documentação pública ou fale com o administrador.</p>
                <Link href="/docs" className="text-blue-300 underline underline-offset-4">Abrir documentação</Link>
            </div>
        );
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-gray-600">Carregando...</div>
            </div>
        );
    }

    if (status !== "authenticated") {
        return (
            <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0B111C] text-slate-100">
                {/* subtle grid */}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />
                <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

                <main className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
                    <section className="space-y-8">
                        <div className="flex items-center gap-3">
                            <M7Logo className="h-11 w-11" />
                            <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{BRAND_NAME}</span>
                            <span className="rounded-md border border-blue-500/70 px-2 py-0.5 text-sm font-medium text-blue-400">API</span>
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
                                Suas integrações.<br />Novas possibilidades.
                            </h1>
                            <p className="max-w-xl text-base text-slate-400 sm:text-lg">Acesse a documentação e conecte suas aplicações ao {BRAND_NAME}.</p>
                        </div>
                        <div className="hidden max-w-xl overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 shadow-2xl sm:block">
                            <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
                                <div className="flex gap-2">
                                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" /><span className="h-3 w-3 rounded-full bg-[#FEBC2E]" /><span className="h-3 w-3 rounded-full bg-[#28C840]" />
                                </div>
                                <span className="text-xs font-medium text-slate-400">API REST</span>
                            </div>
                            <div className="relative px-4 py-4 font-mono text-[13px] leading-7">
                                <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/60 text-blue-400"><Braces className="h-5 w-5" /></span>
                                {[
                                    <><span className="text-blue-400">GET</span>  /api/v1</>,
                                    <>{"{"}</>,
                                    <>  <span className="text-emerald-300">&quot;data&quot;</span>: {"{"}</>,
                                    <>    <span className="text-emerald-300">&quot;message&quot;</span>: <span className="text-amber-200">&quot;Integrações que impulsionam seu negócio.&quot;</span></>,
                                    <>  {"}"}</>,
                                    <>{"}"}</>,
                                ].map((line, i) => (
                                    <div key={i} className="flex gap-4 whitespace-pre-wrap pr-14">
                                        <span className="w-4 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
                                        <span className="text-slate-200">{line}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-2xl backdrop-blur sm:p-10">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold sm:text-3xl">Documentação da API</h2>
                            <p className="mt-2 text-sm text-slate-400 sm:text-base">Entre com suas credenciais para continuar.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-5">
                            <label className="block space-y-2">
                                <span className="text-sm font-medium text-slate-200">E-mail</span>
                                <span className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/40 px-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
                                    <User className="h-5 w-5 shrink-0 text-slate-400" />
                                    <input type="email" value={username} onChange={e => setUsername(e.target.value)} autoComplete="email" required
                                        className="h-12 w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500" placeholder="Digite seu e-mail" />
                                </span>
                            </label>
                            <label className="block space-y-2">
                                <span className="text-sm font-medium text-slate-200">Senha</span>
                                <span className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/40 px-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
                                    <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required
                                        className="h-12 w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500" placeholder="Digite sua senha" />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} className="shrink-0 text-slate-400 hover:text-slate-200" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </span>
                            </label>

                            {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

                            <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-medium text-white transition-colors hover:bg-blue-500">
                                Acessar documentação <ArrowRight className="h-4 w-4" />
                            </button>
                        </form>

                    </section>
                </main>

                <footer className="relative mx-auto w-full max-w-7xl px-4 pb-8 text-sm text-slate-500 sm:px-8">
                    {BRAND_TAGLINE} · baseado no <a href={UPSTREAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">MarcFlow, de Marcos Maia</a>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Documentação da API do {BRAND_NAME}</h1>
                        <p className="text-blue-100 text-sm mt-1">
                            Documentação interativa da API · {BRAND_TAGLINE}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        Sair
                    </button>
                </div>
            </div>

            <div className="container mx-auto">
                <SwaggerUI url="/api/docs" />
            </div>
        </div>
    );
}
