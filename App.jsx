import { useState, useEffect } from "react"
import { supabase, CLINIC_ID } from "./supabase"
const COLORS = ["#3498DB","#E74C3C","#9B59B6","#1ABC9C","#F39C12","#27AE60"]
const avatarColor = s => { let h=0; for(let c of(s||""))h=c.charCodeAt(0)+((h<<5)-h); return
const initials = n => (n||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()
const fmtUSD = c => "$"+(c/100).toLocaleString("en-US",{minimumFractionDigits:0})
const todayStr = () => new Date().toISOString().split("T")[0]
function Av({name,size=32}){
return <div style={{width:size,height:size,borderRadius:"50%",background:avatarColor(name),
}
function Pill({color,children}){
const s={green:{background:"#E8F8F5",color:"#17A589"},amber:{background:"#FEF9E7",color:"#F
return <span style={{...s[color]||s.green,padding:"3px 10px",borderRadius:20,fontSize:11,fo
}
function Btn({onClick,variant="primary",disabled,children,style={}}){
const v={primary:{background:"#2E86C1",color:"#fff"},outline:{background:"#fff",color:"#5D6
return <button onClick={onClick} disabled={disabled} style={{padding:"9px 18px",borderRadiu
}
function Input({label,...props}){
return <div style={{marginBottom:14}}>
{label&&<div style={{fontSize:12,fontWeight:600,color:"#5D6D7E",marginBottom:6}}>{label}<
<input {...props} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1px sol
</div>
}
function Sel({label,children,...props}){
return <div style={{marginBottom:14}}>
{label&&<div style={{fontSize:12,fontWeight:600,color:"#5D6D7E",marginBottom:6}}>{label}<
<select {...props} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1px so
</div>
}
function Modal({open,onClose,title,children}){
if(!open)return null
return <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",ins
<div style={{background:"#fff",borderRadius:16,padding:28,width:"min(480px,94vw)",maxHeig
<div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#0F2744",marginBottom:16}}>{
{children}
</div>
</div>
}
export default function App(){
const [screen,setScreen]=useState("loading")
const [authMode,setAuthMode]=useState("login")
const [form,setForm]=useState({name:"",email:"",password:""})
const [authErr,setAuthErr]=useState("")
const [busy,setBusy]=useState(false)
const [user,setUser]=useState(null)
const [view,setView]=useState("dashboard")
const [patients,setPatients]=useState([])
const [therapists,setTherapists]=useState([])
const [invoices,setInvoices]=useState([])
const [modal,setModal]=useState("")
const [pf,setPf]=useState({fname:"",lname:"",email:"",phone:"",therapist_id:""})
const [tf,setTf]=useState({name:"",email:"",role:"therapist"})
const [inv,setInv]=useState({patient_id:"",therapist_id:"",amount:"",due:"",method:"credit_
const [err,setErr]=useState("")
useEffect(()=>{
supabase.auth.getSession().then(({data})=>{
if(data.session){setUser(data.session.user);setScreen("app")}
else setScreen("auth")
})
},[])
useEffect(()=>{ if(screen==="app")loadAll() },[screen])
async function loadAll(){
const [pr,tr,ir]=await Promise.all([
supabase.from("patients").select("*,therapists(full_name)").eq("clinic_id",CLINIC_ID).o
supabase.from("therapists").select("*").eq("clinic_id",CLINIC_ID).order("created_at",{a
supabase.from("invoices").select("*,patients(full_name),therapists(full_name)").eq("cli
])
setPatients(pr.data||[])
setTherapists(tr.data||[])
setInvoices(ir.data||[])
const d=new Date();d.setDate(d.getDate()+30)
setInv(i=>({...i,due:d.toISOString().split("T")[0]}))
}
async function handleAuth(){
setAuthErr("");setBusy(true)
if(authMode==="signup"){
if(!form.name||!form.email||!form.password){setAuthErr("Fill all fields");setBusy(false
const{data,error}=await supabase.auth.signUp({email:form.email,password:form.password,o
if(error){setAuthErr(error.message);setBusy(false);return}
if(data.user){
await supabase.from("therapists").insert([{clinic_id:CLINIC_ID,full_name:form.name,em
setUser(data.user);setScreen("app")
}else setAuthErr("Check your email to confirm your account.")
}else{
if(!form.email||!form.password){setAuthErr("Enter email and password");setBusy(false);r
const{data,error}=await supabase.auth.signInWithPassword({email:form.email,password:for
if(error){setAuthErr(error.message);setBusy(false);return}
setUser(data.user);setScreen("app")
}
setBusy(false)
}
async function logout(){
await supabase.auth.signOut();setUser(null);setScreen("auth")
}
async function savePatient(){
if(!pf.fname||!pf.lname){setErr("Name required");return}
await supabase.from("patients").insert([{clinic_id:CLINIC_ID,full_name:`${pf.fname} ${pf.
setPf({fname:"",lname:"",email:"",phone:"",therapist_id:""});setModal("");setErr("");load
}
async function saveTherapist(){
if(!tf.name||!tf.email){setErr("Name and email required");return}
await supabase.from("therapists").insert([{clinic_id:CLINIC_ID,full_name:tf.name,email:tf
setTf({name:"",email:"",role:"therapist"});setModal("");setErr("");loadAll()
}
async function saveInvoice(){
if(!inv.patient_id||!inv.therapist_id||!inv.amount){setErr("Fill required fields");return
const num="INV-"+new Date().getFullYear()+"-"+String(invoices.length+1).padStart(4,"0")
const amt=Math.round(parseFloat(inv.amount)*100)
await supabase.from("invoices").insert([{clinic_id:CLINIC_ID,patient_id:inv.patient_id,th
setInv(i=>({...i,patient_id:"",therapist_id:"",amount:""}));setModal("");setErr("");loadA
}
async function markPaid(id){
await supabase.from("invoices").update({status:"paid",paid_at:new Date().toISOString()}).
}
const activeP=patients.filter(p=>p.is_active).length
const collected=invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount_cents,0)
const pending=invoices.filter(i=>i.status==="pending").length
const now=new Date()
const userName=user?.user_metadata?.full_name||user?.email?.split("@")[0]||"User"
const NAV=[{id:"dashboard",icon:" ",label:"Dashboard"},{id:"patients",icon:" ",label:"Pat
const th={fontSize:11,fontWeight:600,textTransform:"uppercase",color:"#7F8C9A",padding:"10p
const td={padding:"11px 14px",fontSize:13,borderBottom:"1px solid #DDE4EE"}
if(screen==="loading")return <div style={{display:"flex",alignItems:"center",justifyContent
if(screen==="auth")return(
<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",ba
<div style={{background:"#fff",borderRadius:20,padding:36,width:"min(400px,94vw)",boxSh
<div style={{fontFamily:"Georgia,serif",fontSize:26,color:"#0F2744",marginBottom:4}}>
<div style={{fontSize:13,color:"#7F8C9A",marginBottom:24}}>Possmozer Mental Health</d
{authErr&&<div style={{background:"#FDEDEC",color:"#C0392B",padding:"10px 14px",borde
{authMode==="signup"&&<Input label="Full Name" value={form.name} onChange={e=>setForm
<Input label="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,e
<Input label="Password" type="password" value={form.password} onChange={e=>setForm(f=
<Btn onClick={handleAuth} disabled={busy} style={{width:"100%",padding:12,fontSize:14
<div style={{textAlign:"center",marginTop:14,fontSize:13,color:"#7F8C9A"}}>
{authMode==="login"?<>No account? <span style={{color:"#2E86C1",cursor:"pointer",fo
</div>
</div>
</div>
)
return(
<div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif",background:"
<aside style={{width:220,background:"#0F2744",display:"flex",flexDirection:"column",fle
<div style={{padding:"22px 18px 18px",borderBottom:"1px solid rgba(255,255,255,.08)"}
<div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#fff"}}>OfficePsy</div>
<div style={{fontSize:9,color:"rgba(255,255,255,.4)",letterSpacing:1.5,textTransfor
</div>
<div style={{margin:"14px 10px",background:"rgba(255,255,255,.07)",borderRadius:10,pa
<div style={{width:32,height:32,background:"linear-gradient(135deg,#2E86C1,#17A589)
<div>
<div style={{fontSize:11,fontWeight:600,color:"#fff"}}>Possmozer</div>
<div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Mental Health</div>
</div>
</div>
<nav style={{flex:1,padding:"6px 0"}}>
{NAV.map(n=>(
<div key={n.id} onClick={()=>setView(n.id)} style={{display:"flex",alignItems:"ce
{view===n.id&&<div style={{position:"absolute",left:-7,top:"50%",transform:"tra
<span style={{fontSize:15,width:18,textAlign:"center"}}>{n.icon}</span>{n.label
</div>
))}
</nav>
<div style={{padding:10,borderTop:"1px solid rgba(255,255,255,.08)"}}>
<div style={{display:"flex",alignItems:"center",gap:9,padding:8,cursor:"pointer"}}
<Av name={userName} size={30}/>
<div>
<div style={{fontSize:12,fontWeight:500,color:"#fff"}}>{userName}</div>
<div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Tap to sign out</div>
</div>
</div>
</div>
</aside>
<main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
<header style={{background:"#fff",borderBottom:"1px solid #DDE4EE",padding:"0 24px",h
<div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#0F2744"}}>{{dashboard:"
<div style={{display:"flex",gap:10}}>
<Btn variant="outline" onClick={()=>{setErr("");setModal("patient")}}>+ Patient</
<Btn onClick={()=>{setErr("");setModal("therapist")}}>+ Therapist</Btn>
</div>
</header>
<div style={{flex:1,overflowY:"auto",padding:"22px 24px"}}>
{view==="dashboard"&&(
<>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBo
{[{l:"Patients",v:activeP,c:"#2E86C1"},{l:"Therapists",v:therapists.length,c:
<div key={k.l} style={{background:"#fff",borderRadius:12,padding:18,border:
<div style={{position:"absolute",top:0,left:0,right:0,height:3,background
<div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:"
<div style={{fontFamily:"Georgia,serif",fontSize:30,color:"#0F2744"}}>{k.
</div>
))}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE"}}>
<div style={{padding:"14px 18px",borderBottom:"1px solid #DDE4EE",display:"
<div style={{fontSize:14,fontWeight:600,color:"#0F2744"}}>Recent Patients
<span style={{fontSize:12,color:"#2E86C1",cursor:"pointer"}} onClick={()=
</div>
{patients.length===0?<div style={{textAlign:"center",padding:32,color:"#7F8
<table style={{width:"100%",borderCollapse:"collapse"}}>
<thead><tr><th style={th}>Patient</th><th style={th}>Status</th></tr></
<tbody>{patients.slice(0,5).map(p=>(
<tr key={p.id}>
<td style={td}><div style={{display:"flex",alignItems:"center",gap:
<td style={td}><Pill color={p.is_active?"green":"red"}>{p.is_active
</tr>
))}</tbody>
</table>
)}
</div>
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE"}}>
<div style={{padding:"14px 18px",borderBottom:"1px solid #DDE4EE"}}>
<div style={{fontSize:14,fontWeight:600,color:"#0F2744"}}>Team</div>
</div>
{therapists.length===0?<div style={{textAlign:"center",padding:32,color:"#7
<div style={{padding:"12px 16px",display:"flex",flexDirection:"column",ga
{therapists.map(t=>(
<div key={t.id} style={{display:"flex",alignItems:"center",gap:11}}>
<Av name={t.full_name} size={34}/>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{t.
<Pill color="green">Active</Pill>
</div>
))}
</div>
)}
</div>
</div>
</>
)}
{view==="patients"&&(
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE"}}>
{patients.length===0?<div style={{textAlign:"center",padding:40,color:"#7F8C9A"
<table style={{width:"100%",borderCollapse:"collapse"}}>
<thead><tr><th style={th}>Patient</th><th style={th}>Therapist</th><th styl
<tbody>{patients.map(p=>(
<tr key={p.id}>
<td style={td}><div style={{display:"flex",alignItems:"center",gap:9}}>
<td style={{...td,fontSize:12,color:"#7F8C9A"}}>{p.therapists?.full_nam
<td style={{...td,fontSize:12,color:"#7F8C9A"}}>{p.phone||"—"}</td>
<td style={td}><Pill color={p.is_active?"green":"red"}>{p.is_active?"Ac
</tr>
))}</tbody>
</table>
)}
</div>
)}
{view==="therapists"&&(
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE"}}>
{therapists.length===0?<div style={{textAlign:"center",padding:40,color:"#7F8C9
<table style={{width:"100%",borderCollapse:"collapse"}}>
<thead><tr><th style={th}>Therapist</th><th style={th}>Role</th><th style={
<tbody>{therapists.map(t=>(
<tr key={t.id}>
<td style={td}><div style={{display:"flex",alignItems:"center",gap:9}}>
<td style={td}><Pill color={t.role==="owner"?"purple":t.role==="admin"?
<td style={{...td,fontSize:12,color:"#7F8C9A"}}>{t.email}</td>
<td style={td}><Pill color="green">Active</Pill></td>
</tr>
))}</tbody>
</table>
)}
</div>
)}
{view==="billing"&&(
<>
<div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
<Btn onClick={()=>{setErr("");setModal("invoice")}}>+ New Invoice</Btn>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBo
{[{l:"Collected",v:fmtUSD(collected),c:"#17A589"},{l:"Pending",v:fmtUSD(invoi
<div key={k.l} style={{background:"#fff",borderRadius:12,padding:18,border:
<div style={{position:"absolute",top:0,left:0,right:0,height:3,background
<div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:"
<div style={{fontFamily:"Georgia,serif",fontSize:28,color:"#0F2744"}}>{k.
</div>
))}
</div>
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE"}}>
{invoices.length===0?<div style={{textAlign:"center",padding:40,color:"#7F8C9
<table style={{width:"100%",borderCollapse:"collapse"}}>
<thead><tr><th style={th}>Invoice</th><th style={th}>Patient</th><th styl
<tbody>{invoices.map(i=>{
const ov=i.status==="pending"&&new Date(i.due_date)<now
return <tr key={i.id}>
<td style={{...td,fontSize:12,fontWeight:700,color:"#2E86C1"}}>{i.inv
<td style={td}>{i.patients?.full_name||"—"}</td>
<td style={{...td,fontWeight:700}}>{fmtUSD(i.amount_cents)}</td>
<td style={{...td,fontSize:12,color:"#7F8C9A"}}>{i.due_date}</td>
<td style={td}><Pill color={i.status==="paid"?"green":ov?"red":"amber
<td style={td}>{i.status==="pending"&&<Btn variant="outline" onClick=
</tr>
})}</tbody>
</table>
)}
</div>
</>
)}
{view==="reports"&&(
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE",paddi
<div style={{fontFamily:"Georgia,serif",fontSize:18,color:"#0F2744",marginBot
{[["Total patients",patients.length,"#0F2744"],["Active",activeP,"#17A589"],[
<div key={l} style={{display:"flex",justifyContent:"space-between",padding:
<span style={{fontSize:13,color:"#7F8C9A"}}>{l}</span>
<span style={{fontWeight:700,color:c}}>{v}</span>
</div>
))}
</div>
<div style={{background:"#fff",borderRadius:12,border:"1px solid #DDE4EE",paddi
<div style={{fontFamily:"Georgia,serif",fontSize:18,color:"#0F2744",marginBot
{[["Collected",fmtUSD(collected),"#17A589"],["Pending",fmtUSD(invoices.filter
<div key={l} style={{display:"flex",justifyContent:"space-between",padding:
<span style={{fontSize:13,color:"#7F8C9A"}}>{l}</span>
<span style={{fontWeight:700,color:c}}>{v}</span>
</div>
))}
</div>
</div>
)}
</div>
</main>
<Modal open={modal==="patient"} onClose={()=>setModal("")} title="Add Patient">
{err&&<div style={{background:"#FDEDEC",color:"#C0392B",padding:"9px 12px",borderRadi
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<Input label="First Name *" value={pf.fname} onChange={e=>setPf(f=>({...f,fname:e.t
<Input label="Last Name *" value={pf.lname} onChange={e=>setPf(f=>({...f,lname:e.ta
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<Input label="Email" type="email" value={pf.email} onChange={e=>setPf(f=>({...f,ema
<Input label="Phone" value={pf.phone} onChange={e=>setPf(f=>({...f,phone:e.target.v
</div>
<Sel label="Therapist" value={pf.therapist_id} onChange={e=>setPf(f=>({...f,therapist
<option value="">Select...</option>
{therapists.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
</Sel>
<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
<Btn variant="outline" onClick={()=>setModal("")}>Cancel</Btn>
<Btn onClick={savePatient}>Add Patient →</Btn>
</div>
</Modal>
<Modal open={modal==="therapist"} onClose={()=>setModal("")} title="Add Therapist">
{err&&<div style={{background:"#FDEDEC",color:"#C0392B",padding:"9px 12px",borderRadi
<Input label="Full Name *" value={tf.name} onChange={e=>setTf(f=>({...f,name:e.target
<Input label="Email *" type="email" value={tf.email} onChange={e=>setTf(f=>({...f,ema
<Sel label="Role" value={tf.role} onChange={e=>setTf(f=>({...f,role:e.target.value}))
<option value="therapist">Therapist</option>
<option value="admin">Admin</option>
<option value="owner">Owner</option>
</Sel>
<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
<Btn variant="outline" onClick={()=>setModal("")}>Cancel</Btn>
<Btn onClick={saveTherapist}>Add Therapist →</Btn>
</div>
</Modal>
<Modal open={modal==="invoice"} onClose={()=>setModal("")} title="New Invoice">
{err&&<div style={{background:"#FDEDEC",color:"#C0392B",padding:"9px 12px",borderRadi
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<Sel label="Patient *" value={inv.patient_id} onChange={e=>setInv(i=>({...i,patient
<option value="">Select...</option>
{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
</Sel>
<Sel label="Therapist *" value={inv.therapist_id} onChange={e=>setInv(i=>({...i,the
<option value="">Select...</option>
{therapists.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
</Sel>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<Input label="Amount (USD) *" type="number" value={inv.amount} onChange={e=>setInv(
<Input label="Due Date *" type="date" value={inv.due} onChange={e=>setInv(i=>({...i
</div>
<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
<Btn variant="outline" onClick={()=>setModal("")}>Cancel</Btn>
<Btn onClick={saveInvoice}>Create Invoice →</Btn>
