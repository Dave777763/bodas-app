import Link from "next/link";
import { ArrowRight, Calendar, Heart, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Hero Section */}
      <header className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-rose-600 font-serif">EventosApp</h1>
        <nav>
          <Link href="/login" className="px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition">
            Ingresar
          </Link>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-7xl font-bold text-gray-900 font-serif mb-6">
          Tu evento, <span className="text-rose-600">perfectamente</span> organizado.
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Gestiona invitados, envía invitaciones digitales y controla cada detalle de tus eventos y celebraciones desde un solo lugar.
        </p>

        <div className="flex justify-center gap-4">
          <Link href="/login" className="flex items-center gap-2 px-8 py-4 bg-rose-600 text-white rounded-full text-lg font-semibold hover:bg-rose-700 transition shadow-lg hover:shadow-xl">
            Comenzar Gratis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Diseños Personalizados</h3>
            <p className="text-gray-500">Crea invitaciones digitales únicas que reflejen tu estilo.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Control de RSVP</h3>
            <p className="text-gray-500">Recibe confirmaciones en tiempo real y gestiona tu lista de invitados.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Logística y Mapa</h3>
            <p className="text-gray-500">Comparte ubicación exacta y cronograma con tus invitados.</p>
          </div>
        </div>
      </main>

      <footer className="text-center py-10 text-gray-400 text-sm">
        © 2024 EventosApp. Todos los derechos reservados.
      </footer>
    </div>
  );
}
