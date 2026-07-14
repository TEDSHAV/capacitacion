"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShieldCheck, Building2, User, Award, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { searchByParticipantId, searchByCompanyRif, PublicVerificationResult } from "@/app/actions/verification";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicVerificationPage() {
  const [activeTab, setActiveTab] = useState<"individual" | "company">("individual");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PublicVerificationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = activeTab === "individual" 
        ? await searchByParticipantId(searchValue)
        : await searchByCompanyRif(searchValue);

      if (response.success && response.data) {
        setResults(response.data);
        if (response.data.length === 0) {
          setError("No se encontraron registros activos para los datos proporcionados.");
        }
      } else {
        setError(response.error || "Ocurrió un error al realizar la búsqueda.");
      }
    } catch (err) {
      setError("Error de conexión. Por favor intente de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-blue-50/30">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section - Compact & Modern Refinement */}
        <section className="relative min-h-[calc(100vh-12rem)] md:min-h-0 flex flex-col justify-center pt-8 md:pt-12 pb-12 md:pb-16 px-4 overflow-hidden border-b border-blue-100/50">
          {/* Slick Background Refinement */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.05]" 
               style={{ backgroundImage: 'radial-gradient(#1e40af 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          {/* Vibrant Mesh Gradients */}
          <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-600/10 text-blue-700 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 md:mb-6 border border-blue-200 shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 mr-2 text-blue-600" />
              Verificación Segura de Credenciales
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 md:mb-6 tracking-tighter leading-[1.1]">
              Autenticidad <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800">Garantizada</span>
            </h1>
            
            <p className="text-base md:text-lg text-gray-600 mb-8 md:mb-10 max-w-xl mx-auto font-medium leading-relaxed">
              Sistema oficial para la validación de certificados y carnets profesionales emitidos por nuestro centro de capacitación.
            </p>

            {/* Search Container - Compact Slick Card */}
            <div className="bg-white/90 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(30,58,138,0.12)] p-6 md:p-8 max-w-2xl mx-auto border border-blue-100/50 backdrop-blur-xl">
              <div className="flex mb-6 md:mb-8 gap-4 md:gap-5">
                <button
                  onClick={() => { setActiveTab("individual"); setResults(null); setError(null); }}
                  className={`flex-1 flex items-center justify-center py-3 md:py-3.5 rounded-xl font-bold transition-all border-2 ${
                    activeTab === "individual" 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                      : "bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <User className={`w-4 h-4 mr-2 ${activeTab === 'individual' ? 'text-white' : 'text-gray-300'}`} />
                  Individual
                </button>
                <button
                  onClick={() => { setActiveTab("company"); setResults(null); setError(null); }}
                  className={`flex-1 flex items-center justify-center py-3 md:py-3.5 rounded-xl font-bold transition-all border-2 ${
                    activeTab === "company" 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                      : "bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <Building2 className={`w-4 h-4 mr-2 ${activeTab === 'company' ? 'text-white' : 'text-gray-300'}`} />
                  Empresa
                </button>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 md:gap-5">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={activeTab === "individual" ? "Cédula o ID" : "RIF de la empresa"}
                    className="block w-full pl-12 pr-5 py-3.5 md:py-4 bg-blue-50/30 border-2 border-blue-50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 focus:bg-white outline-none transition-all duration-300 text-base md:text-lg placeholder:text-gray-400 text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-3.5 md:py-4 px-8 md:px-10 rounded-2xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Consultar"
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Results Section - Slick Grid */}
        <section className="py-12 md:py-16 px-4 max-w-6xl mx-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-b-blue-400 rounded-full animate-pulse"></div>
              </div>
              <p className="mt-8 text-gray-500 font-semibold tracking-wide uppercase text-xs">Validando Credenciales...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-white border border-amber-100 p-8 rounded-[2rem] max-w-2xl mx-auto flex items-start shadow-xl shadow-amber-500/5">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mr-6 flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-xl mb-2">Información de Búsqueda</h3>
                <p className="text-gray-500 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 flex items-center tracking-tight">
                    Registros <span className="text-blue-600 ml-2">Encontrados</span>
                  </h2>
                  <p className="text-gray-500 mt-2 font-medium">Se han localizado {results.length} credenciales válidas</p>
                </div>
                <div className="inline-flex items-center bg-green-50 text-green-700 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-green-100 self-start md:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                  Estado: Activo
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {results.map((item) => (
                  <div 
                    key={`${item.type}-${item.id}`}
                    className="group bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] transition-all duration-500 p-8 flex flex-col h-full hover:-translate-y-1"
                  >
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-8">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
                          item.type === 'certificate' 
                            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' 
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          {item.type === 'certificate' ? <Award className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 uppercase tracking-tighter">
                          ID: {item.controlNumber || item.id}
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-extrabold text-gray-900 mb-4 line-clamp-2 leading-[1.2] group-hover:text-blue-700 transition-colors">
                        {item.courseName}
                      </h3>
                      
                      <div className="space-y-4 mb-10">
                        <div className="flex items-center text-gray-700 font-bold">
                          <User className="w-4 h-4 mr-3 text-gray-400" />
                          <span className="text-base">{item.participantName}</span>
                        </div>
                        <div className="flex items-center text-gray-500 font-medium text-sm">
                          <div className="w-1 h-1 bg-gray-300 rounded-full mr-3"></div>
                          <span className="mr-2 opacity-60">Emisión:</span>
                          <span>{new Date(item.issueDate).toLocaleDateString()}</span>
                        </div>
                        {item.expiryDate && (
                          <div className="flex items-center text-gray-500 font-medium text-sm">
                            <div className="w-1 h-1 bg-gray-300 rounded-full mr-3"></div>
                            <span className="mr-2 opacity-60">Vencimiento:</span>
                            <span className="text-gray-900">{new Date(item.expiryDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link 
                      href={`/verify-certificate/${item.id}`}
                      target="_blank"
                      className="w-full flex items-center justify-center py-4.5 bg-gray-50 hover:bg-blue-600 text-gray-900 hover:text-white font-black rounded-2xl transition-all duration-300 group/btn text-sm tracking-tight border border-gray-100 hover:border-blue-600"
                    >
                      DETALLE COMPLETO
                      <ExternalLink className="w-4 h-4 ml-2.5 opacity-40 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Benefits Section */}
        <section className="bg-blue-50/20 py-12 md:py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 mb-10 md:mb-12 tracking-tight">Seguridad y Confianza</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-blue-50 text-center group hover:shadow-xl transition-all duration-500">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-4 tracking-tight">Validación Real</h3>
                <p className="text-gray-500 leading-relaxed font-medium">
                  Todos los resultados provienen directamente de nuestra base de datos centralizada y segura.
                </p>
              </div>
              <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-blue-50 text-center group hover:shadow-xl transition-all duration-500">
                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500">
                  <Award className="w-10 h-10" />
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-4 tracking-tight">Reconocimiento</h3>
                <p className="text-gray-500 leading-relaxed font-medium">
                  Nuestros certificados son ampliamente aceptados por las principales empresas del sector.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
