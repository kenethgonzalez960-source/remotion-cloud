import React from 'react';
import {AbsoluteFill} from 'remotion';

export const COLLAGE_W = 1080;
export const COLLAGE_H = 1350;

export type CollageProps = {
  /** Número de la pieza. Vacío = la imagen no lleva número. */
  numero: string;
  /** Título en mayúsculas; la palabra entre *asteriscos* se resalta en rojo. */
  titulo: string;
  apoyo: string[];
  recorteTitular: string;
  recorteMedio: string;
  /** Foto libre como data URI. Si es null se usa el formato sin persona. */
  foto: string | null;
  tono: 'amarillo' | 'rojo';
  canal: string;
};

export const collageDefaults: CollageProps = {
  numero: '',
  titulo: 'TÍTULO DE *EJEMPLO* PARA LA PIEZA',
  apoyo: ['Primer párrafo de apoyo con el hecho principal.', 'Segundo párrafo que explica por qué importa.'],
  recorteTitular: 'Titular real de la nota',
  recorteMedio: 'Medio',
  foto: null,
  tono: 'amarillo',
  canal: 'Giro Hacia La Izquierda',
};

const PAPEL = '#f1ead8';
const TINTA = '#141414';
const ROJO = '#d11a1a';
const AMARILLO = '#ffe14a';

const noise =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const rasgado = 'polygon(0% 3%, 6% 0%, 14% 2%, 23% 0%, 33% 3%, 44% 0%, 55% 2%, 66% 0%, 77% 3%, 88% 0%, 100% 2%, 99% 30%, 100% 55%, 98% 80%, 100% 100%, 90% 98%, 78% 100%, 65% 98%, 52% 100%, 40% 98%, 27% 100%, 14% 98%, 0% 100%, 2% 75%, 0% 50%, 2% 25%)';

const Titulo: React.FC<{texto: string}> = ({texto}) => {
  const partes = texto.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('*') ? (
          <span key={i} style={{color: ROJO}}>{p.slice(1, -1)}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

export const Collage: React.FC<CollageProps> = (p) => {
  const conFoto = p.foto !== null;
  const tinte = p.tono === 'rojo' ? 'rgba(209,26,26,0.55)' : 'rgba(255,225,74,0.6)';
  return (
    <AbsoluteFill style={{backgroundColor: PAPEL, fontFamily: '"Helvetica Neue", Arial, sans-serif', color: TINTA}}>
      <AbsoluteFill style={{backgroundImage: noise}} />

      {conFoto && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 520, height: 330, backgroundImage: `url(${p.foto})`, backgroundSize: 'cover', backgroundPosition: 'center 25%', filter: 'grayscale(1) contrast(1.1)'}}>
          <div style={{position: 'absolute', inset: 0, background: tinte, mixBlendMode: 'multiply'}} />
        </div>
      )}

      {p.numero !== '' && (
        <div style={{position: 'absolute', left: 56, top: 34, fontSize: 150, fontWeight: 900, color: ROJO, lineHeight: 1}}>{p.numero}</div>
      )}

      <div style={{position: 'absolute', left: 56, right: 56, top: p.numero ? 190 : 70}}>
        <span style={{fontSize: 74, fontWeight: 900, lineHeight: 1.28, textTransform: 'uppercase', background: `linear-gradient(transparent 12%, ${AMARILLO} 12%, ${AMARILLO} 92%, transparent 92%)`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0 10px'}}>
          <Titulo texto={p.titulo} />
        </span>
      </div>

      {conFoto && (
        <div style={{position: 'absolute', right: 50, top: 400, width: 380, height: 480, transform: 'rotate(3deg)', background: '#fff', padding: 14, boxShadow: '8px 10px 0 rgba(0,0,0,.25)'}}>
          <div style={{width: '100%', height: '100%', backgroundImage: `url(${p.foto})`, backgroundSize: 'cover', backgroundPosition: 'center top', clipPath: rasgado}} />
        </div>
      )}

      <div style={{position: 'absolute', left: 56, width: conFoto ? 560 : 968, top: conFoto ? 400 : 440, fontSize: 38, fontWeight: 800, lineHeight: 1.3}}>
        {p.apoyo.map((t, i) => (
          <p key={i} style={{margin: '0 0 22px', textDecoration: 'underline', textDecorationColor: ROJO, textDecorationThickness: 5, textUnderlineOffset: 7}}>{t}</p>
        ))}
      </div>

      <div style={{position: 'absolute', left: 70, right: 70, bottom: 120, background: '#fffdf6', padding: '30px 38px', transform: 'rotate(-1.2deg)', clipPath: rasgado, boxShadow: '0 0 0 2px rgba(0,0,0,.1)'}}>
        <div style={{fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', color: '#666', marginBottom: 10}}>{p.recorteMedio}</div>
        <div style={{fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 42, fontWeight: 700, lineHeight: 1.2}}>{p.recorteTitular}</div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: TINTA, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase'}}>
        {p.canal}
      </div>
    </AbsoluteFill>
  );
};
