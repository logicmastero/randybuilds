export default function NotFound() {
  return (
    <div style={{minHeight:"100vh",background:"#0b0b09",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',-apple-system,sans-serif",padding:"40px 24px",textAlign:"center"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');`}</style>
      <div style={{fontSize:80,marginBottom:16,opacity:.15,fontFamily:"'Instrument Serif',serif",letterSpacing:"-.04em",lineHeight:1}}>404</div>
      <div style={{fontFamily:"'Instrument Serif',serif",fontSize:"clamp(28px,4vw,44px)",letterSpacing:"-.025em",color:"#e8e2d8",marginBottom:12,lineHeight:1.1}}>
        Nothing here <em style={{fontStyle:"italic",color:"rgba(232,226,216,0.5)"}}>yet.</em>
      </div>
      <div style={{fontSize:15,color:"rgba(232,226,216,0.45)",maxWidth:340,lineHeight:1.7,marginBottom:36}}>
        This page doesn't exist — but your new website is about to.
      </div>
      <a href="/" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 28px",borderRadius:10,background:"#c8a96e",color:"#0b0b09",textDecoration:"none",fontSize:14,fontWeight:700,letterSpacing:"-.01em"}}>
        Back to Sitecraft →
      </a>
    </div>
  );
}
