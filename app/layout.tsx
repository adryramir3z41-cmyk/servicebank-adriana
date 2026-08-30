import type { Metadata } from "next";
import "./globals.css";
import "./detail.css";
export const metadata:Metadata={title:"ServiceBank | Mesa de servicio",description:"Prototipo académico de mesa de servicio tecnológica"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
