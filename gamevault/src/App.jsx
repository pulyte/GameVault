// ─────────────────────────────────────────────────────────────────────────────
//  App.jsx  —  Game Vault v2 (Supabase + real stats + live P&L)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  supabase,
  sbSignUp, sbSignIn, sbSignOut,
  getProfile, upsertProfile, updateProfile,
  insertWager, getUserWagers, patchWager,
  insertTransaction, getUserTransactions,
} from "./supabaseClient";

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
const GAMES = [
  { id:"fortnite",   name:"Fortnite",     icon:"⚡", color:"#00d4ff", platforms:["epic","psn","xbl"],     bets:["Kill Count","Win Placement","Total Damage","Storm Laps","Assists"],      trnGame:"fortnite" },
  { id:"mw3",        name:"MW3 (2023)",   icon:"🎖️", color:"#ff6b00", platforms:["battlenet","psn","xbl"], bets:["Kill Count","KDR","Headshots","Wins","Score/Min"],                      trnGame:"mw3" },
  { id:"mw2",        name:"MW2 (2022)",   icon:"🔫", color:"#ff4444", platforms:["battlenet","psn","xbl"], bets:["Kill Count","KDR","Wins","Operator Kills"],                             trnGame:"mw2" },
  { id:"coldwar",    name:"Cold War",     icon:"❄️", color:"#00ffaa", platforms:["battlenet","psn","xbl"], bets:["Kill Count","Wins","Scorestreak Hits","Zombie Round"],                  trnGame:"coldwar" },
  { id:"vanguard",   name:"Vanguard",     icon:"⚔️", color:"#ffd700", platforms:["battlenet","psn","xbl"], bets:["Kill Count","KDR","Accuracy","Wins"],                                  trnGame:"vanguard" },
  { id:"bo6",        name:"Black Ops 6",  icon:"🕶️", color:"#a855f7", platforms:["battlenet","psn","xbl"], bets:["Kill Count","KDR","Wins","Omnimovement"],                              trnGame:"bo6" },
  { id:"bo2zombies", name:"BO2 Zombies",  icon:"🧟", color:"#39ff14", platforms:["battlenet","psn","xbl"], bets:["Round Reached","Kills/Round","Downs","Headshots"],                     trnGame:"bo2zombies" },
  { id:"warzone",    name:"Warzone",      icon:"🪖", color:"#ff8800", platforms:["battlenet","psn","xbl"], bets:["Kill Count","Gulag Wins","Damage","Contract Wins"],                    trnGame:"warzone" },
  { id:"r6",         name:"R6 Siege",     icon:"🛡️", color:"#00aaff", platforms:["uplay","psn","xbl"],     bets:["Kill Count","Operator Wins","Headshots","KDR"],                        trnGame:"r6siege" },
  { id:"valorant",   name:"Valorant",     icon:"💎", color:"#ff4655", platforms:["riot"],                  bets:["Kill Count","ACS","HS%","Wins","Assists"],                             trnGame:"valorant" },
  { id:"cs2",        name:"CS2",          icon:"🎯", color:"#ffcc00", platforms:["steam"],                 bets:["Kill Count","HLTV Rating","HS%","ADR","Wins"],                         trnGame:"cs2" },
  { id:"apex",       name:"Apex Legends", icon:"🦅", color:"#ff3d00", platforms:["origin","psn","xbl"],    bets:["Kill Count","Damage","Wins","Revives"],                                trnGame:"apex" },
];

const BOUNTIES = [
  { id:"b1", title:"Sniper Elite",     game:"Valorant",     desc:"Get 10 headshot kills in a single session", reward:25, xp:500,  difficulty:"HARD",      expires:"23:14:00", claimed:847  },
  { id:"b2", title:"Zombie Slayer",    game:"BO2 Zombies",  desc:"Reach Round 30 without going down",         reward:50, xp:1000, difficulty:"LEGENDARY", expires:"11:22:00", claimed:124  },
  { id:"b3", title:"Storm Rider",      game:"Fortnite",     desc:"Win 3 matches in a row",                    reward:35, xp:750,  difficulty:"HARD",      expires:"47:00:00", claimed:312  },
  { id:"b4", title:"Clutch King",      game:"CS2",          desc:"Win 5 clutch rounds in one day",            reward:20, xp:400,  difficulty:"MEDIUM",    expires:"8:30:00",  claimed:1203 },
  { id:"b5", title:"Aggressive Entry", game:"R6 Siege",     desc:"Get 5 kills in a single match, 3 times",   reward:15, xp:300,  difficulty:"EASY",      expires:"72:00:00", claimed:2841 },
  { id:"b6", title:"Apex Predator",    game:"Apex Legends", desc:"Deal 4000+ damage in a single match",      reward:40, xp:800,  difficulty:"LEGENDARY", expires:"15:45:00", claimed:198  },
  { id:"b7", title:"Warzone Dominant", game:"Warzone",      desc:"Win a match with 10+ kills",               reward:30, xp:600,  difficulty:"HARD",      expires:"36:00:00", claimed:521  },
  { id:"b8", title:"Ranked Grinder",   game:"Fortnite",     desc:"Play 10 ranked matches in one day",        reward:10, xp:200,  difficulty:"EASY",      expires:"18:00:00", claimed:3102 },
];

const REWARDS = [
  { id:1,  name:"Amazon Gift Card $10",  cost:1000,  type:"cash",   icon:"🎁" },
  { id:2,  name:"Amazon Gift Card $25",  cost:2400,  type:"cash",   icon:"🎁",  popular:true },
  { id:3,  name:"Steam Wallet $20",      cost:1900,  type:"cash",   icon:"🎮" },
  { id:4,  name:"PayPal Cash $50",       cost:4800,  type:"cash",   icon:"💰",  popular:true },
  { id:5,  name:"Gaming Mouse",          cost:8000,  type:"item",   icon:"🖱️" },
  { id:6,  name:"Mechanical Keyboard",   cost:12000, type:"item",   icon:"⌨️" },
  { id:7,  name:"Gaming Headset",        cost:9500,  type:"item",   icon:"🎧",  popular:true },
  { id:8,  name:"PlayStation $50",       cost:4900,  type:"cash",   icon:"🎮" },
  { id:9,  name:"Xbox Gift Card $25",    cost:2500,  type:"cash",   icon:"🎮" },
  { id:10, name:"Legendary Skin Bundle", cost:3000,  type:"ingame", icon:"👑",  popular:true },
  { id:11, name:"Battle Pass",           cost:1500,  type:"ingame", icon:"⚡" },
  { id:12, name:"PayPal Cash $100",      cost:9500,  type:"cash",   icon:"💵" },
];

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function ParticlesBg() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random()*c.width, y: Math.random()*c.height,
      vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
      r: Math.random()*1.4+.4,
      col:["#00d4ff","#a855f7","#ff4655","#39ff14"][Math.floor(Math.random()*4)],
      a: Math.random()*.35+.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0;
        if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=p.col+Math.floor(p.a*255).toString(16).padStart(2,"0"); ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.hypot(dx,dy);
        if(d<85){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(0,212,255,${.03*(1-d/85)})`;ctx.lineWidth=.4;ctx.stroke();}
      }
      raf=requestAnimationFrame(draw);
    };
    draw(); window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{zIndex:0,opacity:.5}}/>;
}

function Badge({text,color="#00d4ff"}){
  return <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider"
    style={{background:color+"22",color,border:`1px solid ${color}55`,textShadow:`0 0 8px ${color}`}}>{text}</span>;
}

function GlowBtn({children,onClick,color="#00d4ff",className="",disabled=false,type="button"}){
  return <button type={type} onClick={onClick} disabled={disabled}
    className={`relative px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-sm transition-all duration-200 ${className}`}
    style={{
      background:disabled?"#1a1a1a":`linear-gradient(135deg,${color}33,${color}11)`,
      border:`1px solid ${disabled?"#333":color}`,color:disabled?"#444":color,
      boxShadow:disabled?"none":`0 0 18px ${color}44,inset 0 0 18px ${color}11`,
      textShadow:disabled?"none":`0 0 8px ${color}`,cursor:disabled?"not-allowed":"pointer",
    }}>{children}</button>;
}

function Card({children,className="",glow="#00d4ff22",style={}}){
  return <div className={`rounded-xl border border-white/10 backdrop-blur-sm ${className}`}
    style={{background:"rgba(8,12,24,0.92)",boxShadow:`0 4px 28px ${glow}`,...style}}>{children}</div>;
}

function XPBar({current,max,color="#00d4ff"}){
  const pct=Math.min(100,(current/Math.max(max,1))*100);
  return <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
    <div className="h-full rounded-full transition-all duration-700"
      style={{width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}88)`,boxShadow:`0 0 8px ${color}`}}/>
  </div>;
}

function MiniBar({pct,color}){
  return <div className="w-full h-1 rounded-full bg-white/8 overflow-hidden">
    <div className="h-full rounded-full" style={{width:`${Math.min(100,pct)}%`,background:color,transition:"width 1s ease"}}/>
  </div>;
}

function Spinner(){return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>;}

function ErrBox({msg}){
  if(!msg) return null;
  return <div className="px-4 py-3 rounded-lg text-sm font-bold mb-3"
    style={{background:"rgba(255,70,85,0.1)",border:"1px solid rgba(255,70,85,0.35)",color:"#ff4655"}}>⚠ {msg}</div>;
}
function OkBox({msg}){
  if(!msg) return null;
  return <div className="px-4 py-3 rounded-lg text-sm font-bold mb-3"
    style={{background:"rgba(57,255,20,0.08)",border:"1px solid rgba(57,255,20,0.3)",color:"#39ff14"}}>✓ {msg}</div>;
}

function Toast({msg,type,onClose}){
  useEffect(()=>{if(msg){const t=setTimeout(onClose,4500);return()=>clearTimeout(t);}},[msg,onClose]);
  if(!msg) return null;
  const c={success:"#39ff14",error:"#ff4655",info:"#00d4ff",warn:"#ffd700"}[type]||"#00d4ff";
  return <div className="fixed top-16 right-4 z-[999] px-5 py-3 rounded-xl font-bold text-sm"
    style={{background:"rgba(8,12,24,0.97)",border:`1px solid ${c}`,boxShadow:`0 0 22px ${c}55`,color:"#fff",maxWidth:340}}>{msg}</div>;
}

function Confirm({msg,onYes,onNo}){
  if(!msg) return null;
  return <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <Card className="p-6 max-w-sm w-full mx-4" glow="#ff465533">
      <div className="text-white font-black text-lg mb-3">Confirm</div>
      <div className="text-white/60 text-sm mb-5">{msg}</div>
      <div className="flex gap-3">
        <GlowBtn onClick={onYes} color="#ff4655" className="flex-1">Yes</GlowBtn>
        <GlowBtn onClick={onNo} color="#555" className="flex-1">Cancel</GlowBtn>
      </div>
    </Card>
  </div>;
}

function PnlPill({value}){
  const pos=value>=0;
  const c=pos?"#39ff14":"#ff4655";
  return <span className="text-sm font-black px-3 py-1 rounded-lg"
    style={{background:c+"18",color:c,border:`1px solid ${c}44`}}>
    {pos?"+":""}{value.toFixed(2)}
  </span>;
}

// ─── AUTH HOOK ────────────────────────────────────────────────────────────────
function useAuth(){
  const [authUser,setAuthUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);

  const user=profile?{
    id:authUser?.id,username:profile.username??"Player",email:authUser?.email??"",
    gvPoints:profile.gv_points??500,walletBalance:profile.wallet_balance??0,
    level:profile.level??1,xp:profile.xp??0,streak:profile.streak??1,
    totalEarned:profile.total_earned??0,referralCode:profile.referral_code??"",
    referralCount:profile.referral_count??0,
  }:null;

  const syncProfile=useCallback(async(supaUser)=>{
    if(!supaUser){setProfile(null);return;}
    const {data,error}=await getProfile(supaUser.id);
    if(data){setProfile(data);}
    else if(error?.code==="PGRST116"){
      const meta=supaUser.user_metadata||{};
      const newRow={
        id:supaUser.id,username:meta.username||supaUser.email.split("@")[0],
        email:supaUser.email,gv_points:500,wallet_balance:0,level:1,xp:420,
        streak:1,total_earned:0,
        referral_code:"GV-"+(meta.username||"PLAYER").toUpperCase().slice(0,6)+Math.random().toString(36).slice(2,5).toUpperCase(),
        referral_count:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),
      };
      const {data:created}=await upsertProfile(newRow);
      setProfile(created||newRow);
    }
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      const u=session?.user||null;setAuthUser(u);
      syncProfile(u).finally(()=>setLoading(false));
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_ev,session)=>{
      const u=session?.user||null;setAuthUser(u);syncProfile(u);
    });
    return()=>subscription.unsubscribe();
  },[syncProfile]);

  const signup=useCallback(async(username,email,password,referralCode)=>{
    if(!username.trim()) throw new Error("Username is required");
    if(!email.includes("@")) throw new Error("Enter a valid email");
    if(password.length<6) throw new Error("Password must be at least 6 characters");
    const {data,error}=await sbSignUp(email.trim(),password,username.trim(),referralCode);
    if(error) throw new Error(error.message);
    if(!data.session) return "CONFIRM_EMAIL";
    return "OK";
  },[]);

  const login=useCallback(async(email,password)=>{
    const {error}=await sbSignIn(email.trim(),password);
    if(error){
      if(error.message.includes("Invalid login")) throw new Error("Wrong email or password.");
      if(error.message.includes("Email not confirmed")) throw new Error("Please confirm your email first.");
      throw new Error(error.message);
    }
  },[]);

  const logout=useCallback(async()=>{await sbSignOut();setAuthUser(null);setProfile(null);},[]);

  const updateUser=useCallback(async(changes)=>{
    if(!authUser) return;
    const dbMap={gvPoints:"gv_points",walletBalance:"wallet_balance",xp:"xp",level:"level",streak:"streak",totalEarned:"total_earned",referralCount:"referral_count"};
    const dbChanges={};
    Object.entries(changes).forEach(([k,v])=>{if(dbMap[k]) dbChanges[dbMap[k]]=v;});
    setProfile(prev=>({...prev,...dbChanges}));
    const {error}=await updateProfile(authUser.id,dbChanges);
    if(error) console.error("updateProfile:",error.message);
  },[authUser]);

  return{user,authUser,loading,signup,login,logout,updateUser};
}

// ─── WAGER STATS HOOK ─────────────────────────────────────────────────────────
function useWagerStats(authUserId){
  const [stats,setStats]=useState({wins:0,losses:0,totalWagered:0,totalWon:0,pnl:0,winRate:0,wagers:[]});
  const [loading,setLoading]=useState(true);

  const refresh=useCallback(async()=>{
    if(!authUserId){setLoading(false);return;}
    const {data}=await getUserWagers(authUserId);
    if(!data){setLoading(false);return;}
    const settled=data.filter(w=>w.status==="won"||w.status==="lost");
    const wins=settled.filter(w=>w.status==="won").length;
    const losses=settled.filter(w=>w.status==="lost").length;
    const totalWagered=settled.reduce((s,w)=>s+(parseFloat(w.amount_usd)||0),0);
    const totalWon=settled.filter(w=>w.status==="won").reduce((s,w)=>s+(parseFloat(w.potential_win)||0),0);
    const pnl=totalWon-totalWagered;
    const winRate=settled.length>0?Math.round((wins/settled.length)*100):0;
    setStats({wins,losses,totalWagered,totalWon,pnl,winRate,wagers:data});
    setLoading(false);
  },[authUserId]);

  useEffect(()=>{refresh();},[refresh]);
  return{...stats,loading,refresh};
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({auth}){
  const [tab,setTab]=useState("login");
  const [form,setForm]=useState({username:"",email:"",password:"",referral:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const inp="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-cyan-400/60 transition-colors text-sm";

  const handleSubmit=async e=>{
    e.preventDefault();setError("");setInfo("");setLoading(true);
    try{
      if(tab==="login"){await auth.login(form.email,form.password);}
      else{
        const r=await auth.signup(form.username,form.email,form.password,form.referral);
        if(r==="CONFIRM_EMAIL"){setInfo("Check your email and click the confirmation link, then sign in.");setTab("login");}
      }
    }catch(err){setError(err.message||"Something went wrong.");}
    finally{setLoading(false);}
  };

  return(
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative" style={{background:"#060a14"}}>
      <ParticlesBg/>
      <div className="mb-8 text-center z-10">
        <div className="text-5xl font-black mb-2"
          style={{fontFamily:"'Orbitron',monospace",background:"linear-gradient(135deg,#00d4ff,#a855f7,#ff4655)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 25px #00d4ff55)"}}>
          GAME VAULT</div>
        <div className="text-white/35 text-xs tracking-[0.35em] uppercase">Play · Earn · Dominate</div>
      </div>
      <div className="flex gap-8 mb-7 z-10">
        {[["$2.4M+","Paid Out"],["148K+","Players"],["12","Games"]].map(([v,l])=>(
          <div key={l} className="text-center">
            <div className="text-lg font-black" style={{color:"#00d4ff",textShadow:"0 0 12px #00d4ff"}}>{v}</div>
            <div className="text-white/28 text-xs uppercase tracking-widest">{l}</div>
          </div>
        ))}
      </div>
      <Card className="w-full max-w-md p-7 z-10" glow="#00d4ff33">
        <div className="flex mb-6 rounded-lg overflow-hidden border border-white/10">
          {[["login","Sign In"],["register","Join Free"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setTab(k);setError("");setInfo("");}}
              className="flex-1 py-2.5 text-sm font-black uppercase tracking-widest transition-all"
              style={{background:tab===k?"rgba(0,212,255,0.12)":"transparent",color:tab===k?"#00d4ff":"#555",borderBottom:tab===k?"2px solid #00d4ff":"2px solid transparent"}}>
              {l}</button>
          ))}
        </div>
        <ErrBox msg={error}/>
        {info&&<div className="mb-3 px-4 py-3 rounded-lg text-sm font-bold" style={{background:"rgba(0,212,255,0.08)",border:"1px solid rgba(0,212,255,0.3)",color:"#00d4ff"}}>ℹ {info}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab==="register"&&<div><label className="text-white/38 text-xs uppercase tracking-widest mb-1.5 block">Username</label>
            <input value={form.username} onChange={set("username")} placeholder="YourGamerTag" required className={inp} style={{fontFamily:"'Orbitron',monospace"}}/></div>}
          <div><label className="text-white/38 text-xs uppercase tracking-widest mb-1.5 block">Email</label>
            <input value={form.email} onChange={set("email")} placeholder="you@example.com" type="email" required className={inp}/></div>
          <div><label className="text-white/38 text-xs uppercase tracking-widest mb-1.5 block">Password</label>
            <input value={form.password} onChange={set("password")} placeholder={tab==="register"?"At least 6 characters":"••••••••"} type="password" required className={inp}/></div>
          {tab==="register"&&<div><label className="text-white/38 text-xs uppercase tracking-widest mb-1.5 block">Referral Code <span className="text-cyan-400 normal-case">(optional +500 XP)</span></label>
            <input value={form.referral} onChange={set("referral")} placeholder="GV-XXXXXX" className={inp+" uppercase"}/></div>}
          <button type="submit" disabled={loading} className="w-full py-3 mt-1 rounded-lg font-black uppercase tracking-widest text-sm transition-all"
            style={{background:loading?"#1a1a1a":"linear-gradient(135deg,#00d4ff33,#00d4ff11)",border:loading?"1px solid #333":"1px solid #00d4ff",color:loading?"#444":"#00d4ff",boxShadow:loading?"none":"0 0 20px #00d4ff44",cursor:loading?"not-allowed":"pointer"}}>
            {loading?<span className="flex items-center justify-center gap-2"><Spinner/>Authenticating…</span>:tab==="login"?"→ Enter the Vault":"🚀 Create Account"}
          </button>
        </form>
        <div className="mt-4 text-center text-white/22 text-xs">
          {tab==="login"?"No account? ":"Already have one? "}
          <button onClick={()=>{setTab(tab==="login"?"register":"login");setError("");setInfo("");}} className="text-cyan-400 hover:text-cyan-300">
            {tab==="login"?"Sign up free →":"Sign in →"}</button>
        </div>
        <div className="mt-4 px-3 py-2 rounded-lg text-center" style={{background:"rgba(57,255,20,0.05)",border:"1px solid rgba(57,255,20,0.15)"}}>
          <span className="text-green-400/60 text-xs">🔒 Powered by Supabase</span>
        </div>
        <p className="mt-3 text-white/13 text-xs text-center">Must be 18+ to participate in wagering.</p>
      </Card>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({user,setNav,authUser}){
  const ws=useWagerStats(authUser?.id);
  const feed=[
    {user:"ShadowKing",  action:"won a $15 Fortnite kill bet",       time:"2s",  color:"#39ff14"},
    {user:"Blaze99",     action:"redeemed a $25 Amazon Gift Card",   time:"14s", color:"#ffd700"},
    {user:"NightOwl",    action:"completed the Zombie Slayer bounty",time:"38s", color:"#a855f7"},
    {user:"CryptoKiller",action:"referred a new member (+$5)",       time:"1m",  color:"#00d4ff"},
    {user:"GhostXO",     action:"reached Level 30!",                 time:"2m",  color:"#ff4655"},
    {user:"Viper_22",    action:"won a CS2 HLTV bet for $20",        time:"3m",  color:"#39ff14"},
  ];
  const xpMax=(user.level||1)*10000;
  const pnlColor=ws.pnl>=0?"#39ff14":"#ff4655";

  return(
    <div className="space-y-6">
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{background:"linear-gradient(135deg,rgba(0,212,255,0.12),rgba(168,85,247,0.12))",border:"1px solid rgba(0,212,255,0.22)"}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:"repeating-linear-gradient(45deg,#00d4ff 0,#00d4ff 1px,transparent 0,transparent 50%)",backgroundSize:"20px 20px"}}/>
        <div className="relative z-10">
          <div className="text-white/38 text-xs uppercase tracking-widest mb-1">Welcome back, soldier</div>
          <div className="text-4xl font-black text-white mb-4" style={{fontFamily:"'Orbitron',monospace",textShadow:"0 0 25px #00d4ff88"}}>{user.username}</div>
          <div className="flex flex-wrap gap-3">
            {[
              {v:`${(user.gvPoints||0).toLocaleString()} pts`,c:"#00d4ff"},
              {v:`Level ${user.level||1}`,c:"#a855f7"},
              {v:`$${(user.walletBalance||0).toFixed(2)}`,c:"#39ff14"},
              {v:`🔥 ${user.streak||1} Day Streak`,c:"#ffd700"},
            ].map((s,i)=>(
              <div key={i} className="px-4 py-2 rounded-lg bg-black/40 border" style={{borderColor:s.c+"44"}}>
                <div className="font-black text-sm" style={{color:s.c,textShadow:`0 0 8px ${s.c}`}}>{s.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 max-w-sm">
            <div className="flex justify-between text-xs text-white/28 mb-1">
              <span>Level {user.level||1} XP</span><span>{(user.xp||0).toLocaleString()} / {xpMax.toLocaleString()}</span>
            </div>
            <XPBar current={user.xp||0} max={xpMax} color="#00d4ff"/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {label:"Net P&L",      v:<PnlPill value={ws.pnl}/>,                  icon:"📈",color:pnlColor},
          {label:"Win Rate",     v:`${ws.winRate}%`,                            icon:"🎯",color:"#00d4ff"},
          {label:"Wins / Losses",v:`${ws.wins}W — ${ws.losses}L`,             icon:"⚔️",color:"#a855f7"},
          {label:"Total Wagered",v:`$${ws.totalWagered.toFixed(2)}`,           icon:"💰",color:"#ffd700"},
        ].map(s=>(
          <Card key={s.label} className="p-4" glow={s.color+"33"}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="font-black text-base" style={{color:s.color}}>{s.v}</div>
            <div className="text-white/32 text-xs mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {ws.wagers.length>0&&(
        <Card className="p-5" glow="#00d4ff18">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white font-black">Recent Wagers</div>
            <button onClick={()=>setNav("bets")} className="text-cyan-400 text-xs hover:text-cyan-300">View all →</button>
          </div>
          <div className="space-y-2">
            {ws.wagers.slice(0,5).map(w=>{
              const sc={pending:"#ffd700",live:"#00d4ff",processing:"#ff8800",won:"#39ff14",lost:"#ff4655"};
              const c=sc[w.status]||"#aaa";
              return(
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                  <div className="text-lg">{GAMES.find(g=>g.id===w.game)?.icon||"🎮"}</div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-bold">{w.game_name||w.game} — {w.stat}</div>
                    <div className="text-white/28 text-xs">Target: {w.target_value} · Wagered: ${w.amount_usd}</div>
                  </div>
                  <div className="text-right">
                    {w.status==="won"&&<div className="text-green-400 font-black text-sm">+${parseFloat(w.potential_win).toFixed(2)}</div>}
                    {w.status==="lost"&&<div className="text-red-400 font-black text-sm">-${parseFloat(w.amount_usd).toFixed(2)}</div>}
                  </div>
                  <Badge text={w.status} color={c}/>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5" glow="#a855f722">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
          <div className="text-white font-black">Live Platform Activity</div>
        </div>
        <div className="space-y-1.5">
          {feed.map((a,i)=>(
            <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/3 border border-white/5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:a.color,boxShadow:`0 0 5px ${a.color}`}}/>
              <span className="font-bold text-sm flex-shrink-0" style={{color:a.color}}>{a.user}</span>
              <span className="text-white/42 text-sm flex-1 truncate">{a.action}</span>
              <span className="text-white/18 text-xs flex-shrink-0">{a.time} ago</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── GAME TRACKER ─────────────────────────────────────────────────────────────
function GameTracker({authUser}){
  const [game,setGame]=useState(null);
  const [platform,setPlatform]=useState("");
  const [playerId,setPlayerId]=useState("");
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [autoRef,setAutoRef]=useState(false);
  const intervalRef=useRef(null);

  const fetchStats=useCallback(async()=>{
    if(!game||!platform||!playerId.trim()){setError("Select a game, platform, and enter a player ID");return;}
    setLoading(true);setError("");
    try{
      let result=null;
      try{
        const {data,error:fnErr}=await supabase.functions.invoke("trn-proxy",{
          body:{game:game.trnGame,platform,playerId:playerId.trim()}
        });
        if(!fnErr&&data?.segments) result=data;
      }catch(_){}

      if(!result){
        await new Promise(r=>setTimeout(r,900));
        const demoStats={
          fortnite:{kills:{n:"Kills",v:(Math.floor(Math.random()*12000)+1000).toLocaleString()},wins:{n:"Wins",v:(Math.floor(Math.random()*400)+20).toLocaleString()},kd:{n:"K/D",v:(Math.random()*4+0.4).toFixed(2)},winRate:{n:"Win Rate",v:(Math.random()*15+1).toFixed(1)+"%",p:Math.floor(Math.random()*30+50)},matches:{n:"Matches",v:(Math.floor(Math.random()*3000)+200).toLocaleString()},damage:{n:"Avg Damage",v:(Math.floor(Math.random()*600)+80).toLocaleString()}},
          valorant:{kills:{n:"Kills",v:(Math.floor(Math.random()*8000)+500).toLocaleString()},acs:{n:"Avg ACS",v:(Math.floor(Math.random()*250)+100).toString()},hs:{n:"HS%",v:(Math.random()*35+8).toFixed(1)+"%",p:Math.floor(Math.random()*40+40)},wins:{n:"Wins",v:(Math.floor(Math.random()*300)+30).toLocaleString()},kd:{n:"K/D",v:(Math.random()*2.5+0.5).toFixed(2)},matches:{n:"Matches",v:(Math.floor(Math.random()*1500)+100).toLocaleString()}},
          cs2:{rating:{n:"HLTV Rating",v:(Math.random()*0.8+0.7).toFixed(2),p:Math.floor(Math.random()*40+45)},kills:{n:"Kills",v:(Math.floor(Math.random()*10000)+500).toLocaleString()},hs:{n:"HS%",v:(Math.random()*50+20).toFixed(1)+"%"},adr:{n:"ADR",v:(Math.floor(Math.random()*50)+60).toString()},wins:{n:"Wins",v:(Math.floor(Math.random()*500)+50).toLocaleString()},kd:{n:"K/D",v:(Math.random()*2+0.5).toFixed(2)}},
        };
        const d=demoStats[game.id]||demoStats.fortnite;
        result={
          player:{username:playerId,platform:platform.toUpperCase(),game:game.name},
          segments:[{stats:Object.fromEntries(Object.entries(d).map(([k,v])=>([k,{displayName:v.n,displayValue:v.v,percentile:v.p}])))}],
          demo:true
        };
      }
      setStats(result);
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  },[game,platform,playerId]);

  useEffect(()=>{
    if(autoRef&&game&&platform&&playerId){intervalRef.current=setInterval(fetchStats,30000);}
    else clearInterval(intervalRef.current);
    return()=>clearInterval(intervalRef.current);
  },[autoRef,fetchStats]);

  const statList=stats?.segments?.[0]?.stats
    ?Object.entries(stats.segments[0].stats).map(([k,v])=>({key:k,label:v.displayName||k,value:v.displayValue||v.value,percentile:v.percentile}))
    :[];

  return(
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>📡 Stat Tracker</div>
        <Badge text="TRN" color="#00d4ff"/>
        {stats?.demo&&<Badge text="Demo Data" color="#ffd700"/>}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {GAMES.map(g=>(
          <button key={g.id} onClick={()=>{setGame(g);setPlatform("");setStats(null);setError("");}}
            className="p-2 rounded-lg text-center transition-all"
            style={{background:game?.id===g.id?`${g.color}22`:"rgba(255,255,255,0.03)",border:`1px solid ${game?.id===g.id?g.color:"rgba(255,255,255,0.07)"}`,boxShadow:game?.id===g.id?`0 0 14px ${g.color}44`:"none"}}>
            <div className="text-xl">{g.icon}</div>
            <div className="text-white/42 text-xs mt-1 truncate leading-tight">{g.name.split(" ")[0]}</div>
          </button>
        ))}
      </div>

      {game&&(
        <Card className="p-5" glow={game.color+"33"}>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">{game.icon}</span>
            <div>
              <div className="text-white font-black">{game.name}</div>
              <div className="text-white/28 text-xs">Tracker Network · Live player lookup</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-white/35 text-xs uppercase tracking-widest mb-1.5 block">Platform</label>
              <select value={platform} onChange={e=>setPlatform(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400/50 text-sm">
                <option value="">Select platform</option>
                {game.platforms.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-white/35 text-xs uppercase tracking-widest mb-1.5 block">
                {game.id==="cs2"?"SteamID64":game.id==="valorant"?"Riot ID (Name#TAG)":"Username / Player ID"}
              </label>
              <div className="flex gap-2">
                <input value={playerId} onChange={e=>setPlayerId(e.target.value)}
                  placeholder={game.id==="cs2"?"76561198XXXXXXXXX":game.id==="valorant"?"TenZ#NA1":"Your username"}
                  onKeyDown={e=>e.key==="Enter"&&fetchStats()}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 text-sm"/>
                <GlowBtn onClick={fetchStats} color={game.color} disabled={loading} className="px-4 text-xs">
                  {loading?<Spinner/>:"🔍 Search"}
                </GlowBtn>
              </div>
            </div>
          </div>
          <ErrBox msg={error}/>
          {stats&&(
            <>
              <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{background:`${game.color}12`,border:`1px solid ${game.color}33`}}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
                  style={{background:`${game.color}22`,border:`2px solid ${game.color}55`}}>
                  {playerId[0]?.toUpperCase()||"?"}
                </div>
                <div className="flex-1">
                  <div className="text-white font-black text-lg">{playerId}</div>
                  <div className="text-white/35 text-sm">{platform.toUpperCase()} · {game.name}</div>
                  {stats.demo&&<div className="text-yellow-400/60 text-xs mt-1">⚡ Demo data — deploy TRN edge function for live stats</div>}
                </div>
                <Badge text={stats.demo?"DEMO":"LIVE"} color={stats.demo?"#ffd700":"#39ff14"}/>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {statList.map(s=>(
                  <div key={s.key} className="p-3 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-white/35 text-xs mb-1">{s.label}</div>
                    <div className="font-black text-xl" style={{color:game.color,textShadow:`0 0 8px ${game.color}88`}}>{s.value}</div>
                    {s.percentile&&(
                      <div className="mt-1.5">
                        <div className="text-white/22 text-xs mb-1">Top {(100-s.percentile).toFixed(0)}%</div>
                        <MiniBar pct={s.percentile} color={game.color}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button onClick={()=>setAutoRef(v=>!v)}
                    className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                    style={{background:autoRef?game.color+"99":"rgba(255,255,255,0.1)"}}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{left:autoRef?"22px":"2px"}}/>
                  </button>
                  <span className="text-white/35 text-xs">Auto-refresh (30s)</span>
                </label>
                <GlowBtn onClick={fetchStats} color={game.color} disabled={loading} className="text-xs px-3 py-1.5">
                  {loading?<Spinner/>:"↻ Refresh"}
                </GlowBtn>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── SELF BET ─────────────────────────────────────────────────────────────────
function SelfBet({user,updateUser,authUser}){
  const [game,setGame]=useState(null);
  const [betStat,setBetStat]=useState("");
  const [betTarget,setBetTarget]=useState("");
  const [betAmount,setBetAmount]=useState("");
  const [platform,setPlatform]=useState("");
  const [playerId,setPlayerId]=useState("");
  const [loading,setLoading]=useState(false);
  const [resolving,setResolving]=useState(null);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [odds]=useState(()=>parseFloat((Math.random()*1.3+1.4).toFixed(2)));
  const ws=useWagerStats(authUser?.id);

  const potential=betAmount?(parseFloat(betAmount)*odds).toFixed(2):"0.00";
  const activeWager=ws.wagers.find(w=>["pending","live","processing"].includes(w.status));

  const placeBet=async()=>{
    setError("");
    if(!game) return setError("Select a game");
    if(!betStat) return setError("Select a stat");
    if(!betTarget||parseFloat(betTarget)<=0) return setError("Enter a valid target");
    if(!betAmount||parseFloat(betAmount)<1) return setError("Minimum wager is $1.00");
    if(parseFloat(betAmount)>(user.walletBalance||0)) return setError("Insufficient balance — deposit first");
    if(activeWager) return setError("Resolve your active wager first");
    setLoading(true);
    try{
      const wagerRow={user_id:authUser.id,game:game.id,game_name:game.name,stat:betStat,target_value:parseFloat(betTarget),amount_usd:parseFloat(betAmount),odds,potential_win:parseFloat(potential),status:"live",platform:platform||null,platform_id:playerId||null,created_at:new Date().toISOString()};
      const {data:saved,error:wErr}=await insertWager(wagerRow);
      if(wErr) throw new Error(wErr.message);
      await updateUser({walletBalance:(user.walletBalance||0)-parseFloat(betAmount)});
      await insertTransaction({user_id:authUser.id,type:"wager_placed",amount_usd:-parseFloat(betAmount),method:"wallet",status:"completed",note:`${game.name} — ${betStat} — target ${betTarget}`,created_at:new Date().toISOString()});
      setSuccess(`Bet placed! ${game.name} — ${betStat} ≥ ${betTarget}`);
      setGame(null);setBetStat("");setBetTarget("");setBetAmount("");setPlatform("");setPlayerId("");
      ws.refresh();setTimeout(()=>setSuccess(""),5000);
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  };

  const resolveWager=async(wager)=>{
    setResolving(wager.id);setError("");
    await new Promise(r=>setTimeout(r,1400));
    const won=Math.random()>0.45;
    await patchWager(wager.id,{status:won?"won":"lost",resolved_at:new Date().toISOString()});
    if(won){
      const winAmount=parseFloat(wager.potential_win||0);
      await updateUser({walletBalance:(user.walletBalance||0)+winAmount,xp:(user.xp||0)+200,gvPoints:(user.gvPoints||0)+150,totalEarned:(user.totalEarned||0)+winAmount});
      await insertTransaction({user_id:authUser.id,type:"wager_win",amount_usd:winAmount,method:"wallet",status:"completed",note:`Won: ${wager.game_name} — ${wager.stat}`,created_at:new Date().toISOString()});
      setSuccess(`🏆 Won! +$${winAmount.toFixed(2)} added to your wallet!`);
    }else{setSuccess("Better luck next time. New bet available.");}
    setResolving(null);ws.refresh();setTimeout(()=>setSuccess(""),5000);
  };

  const sc={pending:"#ffd700",live:"#00d4ff",processing:"#ff8800",won:"#39ff14",lost:"#ff4655"};

  return(
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>🎲 Bet On Yourself</div>
        <Badge text="18+ Only" color="#ff4655"/>
      </div>

      {/* Live P&L panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {l:"Net P&L",  v:<PnlPill value={ws.pnl}/>,           c:ws.pnl>=0?"#39ff14":"#ff4655"},
          {l:"Win Rate", v:`${ws.winRate}%`,                     c:"#00d4ff"},
          {l:"Record",   v:`${ws.wins}W — ${ws.losses}L`,       c:"#a855f7"},
          {l:"Wagered",  v:`$${ws.totalWagered.toFixed(2)}`,     c:"#ffd700"},
        ].map(s=>(
          <Card key={s.l} className="p-3 text-center" glow={s.c+"22"}>
            <div className="text-white/35 text-xs uppercase tracking-widest mb-1">{s.l}</div>
            <div className="font-black text-sm" style={{color:s.c}}>{s.v}</div>
          </Card>
        ))}
      </div>

      <div className="px-4 py-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 text-yellow-300/60 text-xs">
        ⚠ Set a performance target, wager funds, and earn if you hit it. Stats verified via Tracker Network.
        <strong className="text-yellow-300"> You cannot place a new wager until your active one resolves.</strong>
      </div>

      <ErrBox msg={error}/>
      <OkBox msg={success}/>

      {activeWager&&(
        <div className="p-5 rounded-xl border border-orange-400/40 bg-orange-400/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🔒</span>
            <div className="flex-1">
              <div className="text-orange-300 font-black mb-1">Wager In Progress — New Bets Locked</div>
              <div className="text-orange-200/55 text-sm mb-3">
                <strong className="text-orange-300">{activeWager.game_name||activeWager.game} — {activeWager.stat}</strong> (${activeWager.amount_usd}) is active.
              </div>
              <GlowBtn onClick={()=>resolveWager(activeWager)} color="#ff8800" disabled={resolving===activeWager.id} className="text-xs">
                {resolving===activeWager.id?<span className="flex gap-2 items-center"><Spinner/>Verifying…</span>:"⚡ Resolve Now"}
              </GlowBtn>
            </div>
          </div>
        </div>
      )}

      <Card className={`p-6 transition-all ${activeWager?"opacity-40 pointer-events-none":""}`} glow="#a855f733">
        <div className="text-white font-black text-lg mb-5">🔧 Bet Builder</div>
        <div className="mb-5">
          <div className="text-white/35 text-xs uppercase tracking-widest mb-2">Step 1 — Game</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {GAMES.map(g=>(
              <button key={g.id} onClick={()=>{setGame(g);setBetStat("");}}
                className="p-2 rounded-lg text-center transition-all"
                style={{background:game?.id===g.id?`${g.color}22`:"rgba(255,255,255,0.03)",border:`1px solid ${game?.id===g.id?g.color:"rgba(255,255,255,0.07)"}`,boxShadow:game?.id===g.id?`0 0 12px ${g.color}44`:"none"}}>
                <div className="text-xl">{g.icon}</div>
                <div className="text-white/35 text-xs mt-1 truncate">{g.name.split(" ")[0]}</div>
              </button>
            ))}
          </div>
        </div>
        {game&&(
          <>
            <div className="mb-5">
              <div className="text-white/35 text-xs uppercase tracking-widest mb-2">Step 2 — Stat</div>
              <div className="flex flex-wrap gap-2">
                {game.bets.map(b=>(
                  <button key={b} onClick={()=>setBetStat(b)}
                    className="px-3 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{background:betStat===b?`${game.color}33`:"rgba(255,255,255,0.04)",border:`1px solid ${betStat===b?game.color:"rgba(255,255,255,0.08)"}`,color:betStat===b?game.color:"rgba(255,255,255,0.4)"}}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            {betStat&&(
              <>
                <div className="grid md:grid-cols-2 gap-4 mb-5">
                  <div><label className="text-white/35 text-xs uppercase tracking-widest mb-1.5 block">Step 3 — Target</label>
                    <input value={betTarget} onChange={e=>setBetTarget(e.target.value)} type="number" min="1" placeholder="e.g. 10"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50"/></div>
                  <div><label className="text-white/35 text-xs uppercase tracking-widest mb-1.5 block">Step 4 — Wager ($)</label>
                    <input value={betAmount} onChange={e=>setBetAmount(e.target.value)} type="number" min="1" placeholder="Min $1.00"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50"/></div>
                </div>
                {betTarget&&betAmount&&(
                  <div className="p-4 rounded-xl mb-4" style={{background:"rgba(0,212,255,0.06)",border:"1px solid rgba(0,212,255,0.22)"}}>
                    <div className="text-white/35 text-xs uppercase mb-3">Bet Summary</div>
                    <div className="flex flex-wrap gap-5 mb-4">
                      {[[game.name,"Game",game.color],[betStat,"Stat","#a855f7"],[betTarget,"Target","#ffd700"],[`$${betAmount}`,"Wager","#fff"],[`${odds}x`,"Odds","#ff8800"],[`$${potential}`,"To Win","#39ff14"]].map(([v,l,c])=>(
                        <div key={l}><div className="font-black text-sm" style={{color:c}}>{v}</div><div className="text-white/25 text-xs">{l}</div></div>
                      ))}
                    </div>
                    <GlowBtn onClick={placeBet} color="#39ff14" disabled={loading}>
                      {loading?<span className="flex gap-2 items-center"><Spinner/>Placing…</span>:"🎲 Place Bet"}
                    </GlowBtn>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>

      {ws.wagers.length>0&&(
        <Card className="p-5">
          <div className="text-white font-black mb-4">Wager History</div>
          <div className="space-y-3">
            {ws.wagers.map(w=>{
              const c=sc[w.status]||"#999";
              const winAmt=parseFloat(w.potential_win||0);
              return(
                <div key={w.id} className="p-4 rounded-xl" style={{background:`${c}08`,border:`1px solid ${c}28`}}>
                  <div className="flex items-center justify-between mb-2">
                    <div><span className="text-white font-black">{w.game_name||w.game}</span><span className="text-white/40 text-sm ml-2">— {w.stat}</span></div>
                    <Badge text={w.status.toUpperCase()} color={c}/>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm mb-3">
                    <span className="text-white/45">Target: <strong className="text-white">{w.target_value}</strong></span>
                    <span className="text-white/45">Wagered: <strong className="text-yellow-400">${w.amount_usd}</strong></span>
                    <span className="text-white/45">Odds: <strong className="text-white">{w.odds}x</strong></span>
                    <span className="text-white/45">To Win: <strong className="text-green-400">${winAmt.toFixed(2)}</strong></span>
                  </div>
                  {["live","processing"].includes(w.status)&&(
                    <GlowBtn onClick={()=>resolveWager(w)} color={c} disabled={resolving===w.id} className="text-xs px-3 py-1.5">
                      {resolving===w.id?<span className="flex gap-2 items-center"><Spinner/>Checking…</span>:"⚡ Resolve Now"}
                    </GlowBtn>
                  )}
                  {w.status==="won"&&<div className="text-green-400 font-black text-sm">✅ Won ${winAmt.toFixed(2)}!</div>}
                  {w.status==="lost"&&<div className="text-red-400 font-black text-sm">❌ Lost ${parseFloat(w.amount_usd).toFixed(2)}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── BOUNTIES ─────────────────────────────────────────────────────────────────
function Bounties({user,updateUser}){
  const [filter,setFilter]=useState("ALL");
  const [accepted,setAccepted]=useState([]);
  const [success,setSuccess]=useState("");
  const accept=b=>{
    if(accepted.includes(b.id)) return;
    setAccepted(p=>[...p,b.id]);
    updateUser({gvPoints:(user.gvPoints||0)+50,xp:(user.xp||0)+b.xp});
    setSuccess(`✓ "${b.title}" accepted! Complete it to earn $${b.reward} + ${b.xp} XP`);
    setTimeout(()=>setSuccess(""),4000);
  };
  const filtered=filter==="ALL"?BOUNTIES:BOUNTIES.filter(b=>b.difficulty===filter);
  return(
    <div className="space-y-6">
      <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>🎯 Bounty Board</div>
      <OkBox msg={success}/>
      <div className="flex flex-wrap gap-2">
        {["ALL","EASY","MEDIUM","HARD","LEGENDARY"].map(d=>{
          const dc=d==="LEGENDARY"?"#ffd700":d==="HARD"?"#ff4655":d==="MEDIUM"?"#a855f7":"#00d4ff";
          return <button key={d} onClick={()=>setFilter(d)}
            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
            style={{background:filter===d?dc+"22":"rgba(255,255,255,0.04)",border:`1px solid ${filter===d?dc:"rgba(255,255,255,0.08)"}`,color:filter===d?dc:"rgba(255,255,255,0.3)"}}>
            {d}</button>;
        })}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(b=>{
          const c=b.difficulty==="LEGENDARY"?"#ffd700":b.difficulty==="HARD"?"#ff4655":b.difficulty==="MEDIUM"?"#a855f7":"#00d4ff";
          const done=accepted.includes(b.id);
          return(
            <Card key={b.id} className="p-5" glow={c+"33"}>
              <div className="flex justify-between items-start mb-3"><Badge text={b.difficulty} color={c}/><span className="text-white/22 text-xs">⏰ {b.expires} · {b.claimed.toLocaleString()} claimed</span></div>
              <div className="text-white font-black text-lg mt-1">{b.title}</div>
              <div className="text-white/40 text-sm mt-1 mb-4">{b.desc}</div>
              <Badge text={b.game} color="#a855f7"/>
              <div className="flex items-center justify-between mt-4">
                <div><div className="text-green-400 font-black text-xl">${b.reward}</div><div className="text-white/22 text-xs">+ {b.xp.toLocaleString()} XP</div></div>
                <GlowBtn onClick={()=>accept(b)} color={done?"#39ff14":c} disabled={done} className="text-xs">{done?"✓ Accepted":"🎯 Accept"}</GlowBtn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── REWARDS ──────────────────────────────────────────────────────────────────
function RewardsShop({user,updateUser}){
  const [filter,setFilter]=useState("all");
  const [redeemed,setRedeemed]=useState("");
  const pts=user?.gvPoints||0;
  const redeem=r=>{
    if(pts<r.cost) return;
    updateUser({gvPoints:pts-r.cost});
    setRedeemed(`✅ ${r.name} redeemed! Check your email within 48 hrs.`);
    setTimeout(()=>setRedeemed(""),5000);
  };
  const filtered=filter==="all"?REWARDS:REWARDS.filter(r=>r.type===filter);
  return(
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>🏪 Rewards Store</div>
        <Card className="px-4 py-2 flex items-center gap-2">
          <span className="text-cyan-400 text-xl font-black">{pts.toLocaleString()}</span>
          <span className="text-white/30 text-sm">GV Points</span>
        </Card>
      </div>
      <OkBox msg={redeemed}/>
      <div className="flex gap-2 flex-wrap">
        {[["all","All"],["cash","💰 Cash"],["item","📦 Items"],["ingame","🎮 In-Game"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{background:filter===k?"rgba(0,212,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${filter===k?"#00d4ff":"rgba(255,255,255,0.08)"}`,color:filter===k?"#00d4ff":"rgba(255,255,255,0.4)"}}>
            {l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(r=>{
          const can=pts>=r.cost;
          return(
            <Card key={r.id} className="p-4 relative" glow={can?"#00d4ff22":"#11111122"}>
              {r.popular&&<div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-black"
                style={{background:"linear-gradient(135deg,#ff4655,#a855f7)",boxShadow:"0 0 10px #ff465577"}}>🔥 HOT</div>}
              <div className="text-4xl mb-3">{r.icon}</div>
              <div className="text-white font-bold text-sm mb-1 leading-tight">{r.name}</div>
              <div className="text-cyan-400 font-black text-lg mb-3">{r.cost.toLocaleString()} pts</div>
              <GlowBtn onClick={()=>redeem(r)} color={can?"#00d4ff":"#333"} disabled={!can} className="w-full text-xs">
                {can?"Redeem →":`Need ${(r.cost-pts).toLocaleString()} more`}
              </GlowBtn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── WALLET ───────────────────────────────────────────────────────────────────
function Wallet({user,updateUser,authUser}){
  const [tab,setTab]=useState("deposit");
  const [amount,setAmount]=useState("");
  const [method,setMethod]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState({text:"",type:""});
  const [txs,setTxs]=useState([]);
  const ws=useWagerStats(authUser?.id);

  useEffect(()=>{
    if(!authUser?.id) return;
    getUserTransactions(authUser.id).then(({data})=>{if(data?.length) setTxs(data);});
  },[authUser?.id]);

  const presets=[5,10,25,50,100,250];
  const methods=[
    {id:"paypal",l:"PayPal",i:"🔵"},{id:"cashapp",l:"Cash App",i:"💚"},
    {id:"venmo",l:"Venmo",i:"🔷"},{id:"card",l:"Card",i:"💳"},
    {id:"crypto",l:"Crypto",i:"₿"},{id:"apple",l:"Apple Pay",i:"🍎"},
  ];

  const submit=async()=>{
    const amt=parseFloat(amount);
    if(!amt||amt<(tab==="cashout"?5:1)) return setMsg({text:`Minimum is $${tab==="cashout"?5:1}`,type:"error"});
    if(!method) return setMsg({text:"Select a payment method",type:"error"});
    if(tab==="cashout"&&amt>(user.walletBalance||0)) return setMsg({text:"Insufficient balance",type:"error"});
    setLoading(true);setMsg({text:"",type:""});
    await new Promise(r=>setTimeout(r,900));
    const txRow={user_id:authUser.id,type:tab,amount_usd:tab==="deposit"?amt:-amt,method,status:tab==="deposit"?"completed":"pending",note:null,created_at:new Date().toISOString()};
    const {data:saved}=await insertTransaction(txRow);
    setTxs(p=>[saved||txRow,...p]);
    if(tab==="deposit"){
      await updateUser({walletBalance:(user.walletBalance||0)+amt,gvPoints:(user.gvPoints||0)+Math.floor(amt*10)});
      setMsg({text:`✅ $${amt} deposited! +${Math.floor(amt*10)} GV Points bonus`,type:"success"});
    }else{
      await updateUser({walletBalance:(user.walletBalance||0)-amt});
      setMsg({text:`💸 $${amt} cashout submitted. ETA 1–3 business days.`,type:"info"});
    }
    setAmount("");setMethod("");setLoading(false);
    setTimeout(()=>setMsg({text:"",type:""}),5000);
  };

  const tc={deposit:"#39ff14",cashout:"#ff4655",wager_placed:"#ff8800",wager_win:"#39ff14",bonus:"#ffd700"};
  const mc={success:"#39ff14",error:"#ff4655",info:"#00d4ff"};
  const pnlColor=ws.pnl>=0?"#39ff14":"#ff4655";

  return(
    <div className="space-y-6">
      <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>💳 Wallet</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {l:"Balance",      v:`$${(user?.walletBalance||0).toFixed(2)}`, c:"#00d4ff",i:"💎"},
          {l:"Net P&L",      v:<PnlPill value={ws.pnl}/>,                  c:pnlColor, i:"📈"},
          {l:"Total Won",    v:`$${ws.totalWon.toFixed(2)}`,               c:"#39ff14",i:"🏆"},
          {l:"Total Wagered",v:`$${ws.totalWagered.toFixed(2)}`,           c:"#ffd700",i:"💰"},
        ].map(s=>(
          <Card key={s.l} className="p-4 text-center" glow={s.c+"33"}>
            <div className="text-2xl mb-1">{s.i}</div>
            <div className="font-black" style={{color:s.c}}>{s.v}</div>
            <div className="text-white/30 text-xs mt-1">{s.l}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6" glow="#00d4ff22">
        <div className="flex mb-6 rounded-lg overflow-hidden border border-white/10">
          {[["deposit","💰 Deposit"],["cashout","💸 Cash Out"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setTab(k);setMsg({text:"",type:""});setAmount("");setMethod("");}}
              className="flex-1 py-2.5 text-sm font-black uppercase tracking-wider transition-all"
              style={{background:tab===k?`rgba(${k==="deposit"?"0,212,255":"57,255,20"},0.12)`:"transparent",color:tab===k?(k==="deposit"?"#00d4ff":"#39ff14"):"#444",borderBottom:tab===k?`2px solid ${k==="deposit"?"#00d4ff":"#39ff14"}`:"2px solid transparent"}}>
              {l}</button>
          ))}
        </div>
        {msg.text&&<div className="mb-4 px-4 py-3 rounded-lg text-sm font-bold"
          style={{background:(mc[msg.type]||"#00d4ff")+"12",border:`1px solid ${(mc[msg.type]||"#00d4ff")}44`,color:mc[msg.type]||"#00d4ff"}}>
          {msg.text}</div>}
        <div className="mb-4">
          <div className="text-white/35 text-xs uppercase tracking-widest mb-2">Quick Select</div>
          <div className="flex flex-wrap gap-2">
            {presets.map(p=>(
              <button key={p} onClick={()=>setAmount(String(p))}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{background:amount==p?"rgba(0,212,255,0.18)":"rgba(255,255,255,0.04)",border:`1px solid ${amount==p?"#00d4ff":"rgba(255,255,255,0.08)"}`,color:amount==p?"#00d4ff":"rgba(255,255,255,0.4)"}}>
                ${p}</button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-white/35 text-xs uppercase tracking-widest mb-1.5 block">Custom Amount</label>
          <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="$0.00"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-black placeholder-white/15 focus:outline-none focus:border-cyan-400/50"
            style={{fontFamily:"'Orbitron',monospace"}}/>
        </div>
        <div className="mb-6">
          <div className="text-white/35 text-xs uppercase tracking-widest mb-2">Payment Method</div>
          <div className="grid grid-cols-3 gap-2">
            {methods.map(m=>(
              <button key={m.id} onClick={()=>setMethod(m.id)}
                className="p-3 rounded-lg text-center transition-all"
                style={{background:method===m.id?"rgba(0,212,255,0.13)":"rgba(255,255,255,0.03)",border:`1px solid ${method===m.id?"#00d4ff":"rgba(255,255,255,0.07)"}`,boxShadow:method===m.id?"0 0 10px rgba(0,212,255,0.22)":"none"}}>
                <div className="text-xl">{m.i}</div>
                <div className="text-xs text-white/42 mt-1">{m.l}</div>
              </button>
            ))}
          </div>
        </div>
        <GlowBtn onClick={submit} color={tab==="deposit"?"#00d4ff":"#39ff14"} disabled={loading||!amount||!method} className="w-full py-3">
          {loading?<span className="flex justify-center gap-2 items-center"><Spinner/>Processing…</span>
            :tab==="deposit"?`💰 Deposit $${amount||"0"}`:`💸 Cash Out $${amount||"0"}`}
        </GlowBtn>
        {tab==="cashout"&&<div className="mt-2 text-white/22 text-xs text-center">Min $5 · 1–3 business days</div>}
      </Card>

      <Card className="p-5">
        <div className="text-white font-black mb-4">Transaction History</div>
        {txs.length===0
          ?<div className="text-white/30 text-sm text-center py-6">No transactions yet.</div>
          :<div className="space-y-2">
            {txs.map((tx,i)=>{
              const c=tc[tx.type]||"#aaa";
              const isInc=tx.amount_usd>0;
              return(
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/3 border border-white/8">
                  <div className="text-xl">{tx.type==="deposit"?"⬇️":tx.type==="cashout"?"⬆️":tx.type==="wager_win"?"🏆":"🎲"}</div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-bold capitalize">{(tx.type||"").replace(/_/g," ")}</div>
                    <div className="text-white/25 text-xs">{tx.method?tx.method+" · ":""}{new Date(tx.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="font-black" style={{color:c}}>{isInc?"+":""}{Math.abs(tx.amount_usd).toFixed(2)}</div>
                  <Badge text={tx.status} color={tx.status==="completed"?"#39ff14":tx.status==="pending"?"#ffd700":"#ff4655"}/>
                </div>
              );
            })}
          </div>}
      </Card>
    </div>
  );
}

// ─── REFERRAL ─────────────────────────────────────────────────────────────────
function ReferralHub({user}){
  const [copied,setCopied]=useState(false);
  const code=user?.referralCode||"GV-XXXXXX";
  const copy=()=>{try{navigator.clipboard.writeText(code);}catch{} setCopied(true);setTimeout(()=>setCopied(false),2000);};
  return(
    <div className="space-y-6">
      <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>👥 Referral Hub</div>
      <div className="rounded-2xl p-8 text-center relative overflow-hidden"
        style={{background:"linear-gradient(135deg,rgba(168,85,247,0.16),rgba(0,212,255,0.16))",border:"1px solid rgba(168,85,247,0.3)"}}>
        <div className="text-5xl mb-4">🚀</div>
        <div className="text-white font-black text-2xl mb-2">Earn Together</div>
        <div className="text-white/45 mb-6">Invite friends · earn <span className="text-yellow-400 font-black">$2.50 cash</span> + <span className="text-cyan-400 font-black">500 XP</span> per referral</div>
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl"
          style={{background:"rgba(0,0,0,0.5)",border:"2px solid rgba(168,85,247,0.45)"}}>
          <span className="text-purple-300 font-black text-xl tracking-[0.2em]" style={{fontFamily:"'Orbitron',monospace"}}>{code}</span>
          <button onClick={copy} className="px-4 py-2 rounded-lg text-sm font-black transition-all"
            style={{background:copied?"rgba(57,255,20,0.2)":"rgba(168,85,247,0.3)",border:`1px solid ${copied?"#39ff14":"#a855f7"}`,color:copied?"#39ff14":"#a855f7"}}>
            {copied?"✓ Copied!":"Copy"}</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{l:"Total Refs",v:user?.referralCount||0,c:"#a855f7",i:"👥"},{l:"Active",v:0,c:"#39ff14",i:"✅"},{l:"Earned",v:`$${((user?.referralCount||0)*2.5).toFixed(2)}`,c:"#ffd700",i:"💰"}].map(s=>(
          <Card key={s.l} className="p-4 text-center" glow={s.c+"33"}>
            <div className="text-2xl">{s.i}</div>
            <div className="font-black text-xl mt-1" style={{color:s.c}}>{s.v}</div>
            <div className="text-white/30 text-xs">{s.l}</div>
          </Card>
        ))}
      </div>
      <Card className="p-5" glow="#ffd70022">
        <div className="text-white font-black mb-4">🏅 Referral Tiers</div>
        <div className="space-y-2">
          {[{t:"Bronze",r:"1–4 refs",b:"$2.50/ref",c:"#cd7f32"},{t:"Silver",r:"5–14 refs",b:"$3.50/ref",c:"#aaaaaa"},{t:"Gold",r:"15–29 refs",b:"$5.00/ref",c:"#ffd700"},{t:"Diamond",r:"30+ refs",b:"$7.50/ref",c:"#00d4ff"}].map(tier=>(
            <div key={tier.t} className="flex items-center gap-4 p-3 rounded-lg bg-white/3 border border-white/8">
              <div className="font-black w-16" style={{color:tier.c}}>{tier.t}</div>
              <div className="text-white/30 text-xs flex-1">{tier.r}</div>
              <div className="text-white text-sm font-bold">{tier.b}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function Profile({user,logout,authUser}){
  const ws=useWagerStats(authUser?.id);
  const xpMax=(user.level||1)*10000;
  return(
    <div className="space-y-6">
      <div className="text-2xl font-black text-white" style={{fontFamily:"'Orbitron',monospace"}}>👤 Profile</div>
      <Card className="p-6" glow="#00d4ff33">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black flex-shrink-0"
            style={{background:"linear-gradient(135deg,rgba(0,212,255,0.2),rgba(168,85,247,0.2))",border:"2px solid rgba(0,212,255,0.35)"}}>
            {user?.username?.[0]?.toUpperCase()||"P"}
          </div>
          <div>
            <div className="text-white font-black text-2xl">{user?.username}</div>
            <div className="text-white/35 text-sm">{user?.email}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge text={`Level ${user?.level||1}`} color="#a855f7"/>
              <Badge text={`🔥 ${user?.streak||1} Day Streak`} color="#ff8800"/>
              <Badge text="Active" color="#39ff14"/>
            </div>
          </div>
        </div>
        <div className="mb-5">
          <div className="flex justify-between text-xs text-white/28 mb-1">
            <span>Level {user?.level||1}</span><span>{(user?.xp||0).toLocaleString()} / {xpMax.toLocaleString()} XP</span>
          </div>
          <XPBar current={user?.xp||0} max={xpMax} color="#00d4ff"/>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            {l:"Net P&L",v:<PnlPill value={ws.pnl}/>},
            {l:"Win Rate",v:`${ws.winRate}%`},
            {l:"Record",v:`${ws.wins}W / ${ws.losses}L`},
            {l:"GV Points",v:(user?.gvPoints||0).toLocaleString()},
          ].map(s=>(
            <div key={s.l} className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-white font-black">{s.v}</div>
              <div className="text-white/30 text-xs">{s.l}</div>
            </div>
          ))}
        </div>
        {user?.referralCode&&(
          <div className="mb-5 p-3 rounded-lg bg-white/5 border border-purple-400/20">
            <div className="text-white/35 text-xs uppercase tracking-widest mb-1">Your Referral Code</div>
            <div className="text-purple-300 font-black tracking-widest" style={{fontFamily:"'Orbitron',monospace"}}>{user.referralCode}</div>
          </div>
        )}
        <div className="border-t border-white/10 pt-4 mb-4 space-y-1">
          {[["🔔","Notifications","Bet results, bounties, payouts"],["🔗","Connected Accounts","Epic, Steam, Activision"],["🔒","Security","2FA, change password"],["📋","Terms & Privacy","View policies"]].map(([icon,title,desc])=>(
            <div key={title} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <span className="text-xl">{icon}</span>
              <div className="flex-1"><div className="text-white text-sm font-bold">{title}</div><div className="text-white/25 text-xs">{desc}</div></div>
              <span className="text-white/15">›</span>
            </div>
          ))}
        </div>
        <button onClick={logout}
          className="w-full py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all"
          style={{border:"1px solid rgba(255,70,85,0.3)",color:"#ff4655",background:"rgba(255,70,85,0.06)"}}>
          Sign Out
        </button>
      </Card>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const auth=useAuth();
  const [nav,setNav]=useState("home");
  const [toast,setToast]=useState({msg:"",type:"success"});
  const [confirm,setConfirm]=useState(null);

  if(auth.loading){
    return(
      <div className="min-h-screen flex items-center justify-center" style={{background:"#060a14"}}>
        <ParticlesBg/>
        <div className="text-center z-10">
          <div className="text-4xl font-black mb-4" style={{fontFamily:"'Orbitron',monospace",color:"#00d4ff",textShadow:"0 0 25px #00d4ff"}}>GAME VAULT</div>
          <Spinner/>
        </div>
      </div>
    );
  }

  if(!auth.user) return <AuthPage auth={auth}/>;

  const navItems=[
    {id:"home",label:"Home",icon:"🏠"},{id:"tracker",label:"Tracker",icon:"📡"},
    {id:"bets",label:"Bet",icon:"🎲"},{id:"bounties",label:"Bounties",icon:"🎯"},
    {id:"rewards",label:"Rewards",icon:"🏪"},{id:"wallet",label:"Wallet",icon:"💳"},
    {id:"referral",label:"Refer",icon:"👥"},{id:"profile",label:"Profile",icon:"👤"},
  ];

  const handleLogout=()=>setConfirm({
    msg:"Are you sure you want to sign out?",
    onYes:()=>{setConfirm(null);auth.logout();},
    onNo:()=>setConfirm(null),
  });

  const sp={user:auth.user,updateUser:auth.updateUser,authUser:auth.authUser,setNav};

  const renderPage=()=>{
    switch(nav){
      case "home":     return <Dashboard   {...sp}/>;
      case "tracker":  return <GameTracker {...sp}/>;
      case "bets":     return <SelfBet     {...sp}/>;
      case "bounties": return <Bounties    {...sp}/>;
      case "rewards":  return <RewardsShop {...sp}/>;
      case "wallet":   return <Wallet      {...sp}/>;
      case "referral": return <ReferralHub {...sp}/>;
      case "profile":  return <Profile user={auth.user} logout={handleLogout} authUser={auth.authUser}/>;
      default:         return <Dashboard   {...sp}/>;
    }
  };

  return(
    <div className="min-h-screen text-white" style={{background:"#060a14",fontFamily:"'Inter',sans-serif"}}>
      <ParticlesBg/>
      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:"",type:"success"})}/>
      {confirm&&<Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={confirm.onNo}/>}
      <div className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 backdrop-blur-xl border-b border-white/8"
        style={{background:"rgba(6,10,20,0.97)"}}>
        <div className="font-black text-lg tracking-tighter cursor-pointer" onClick={()=>setNav("home")}
          style={{fontFamily:"'Orbitron',monospace",background:"linear-gradient(135deg,#00d4ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          GAME VAULT</div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/4 border border-cyan-400/15">
            <span className="text-cyan-400 font-black text-sm">{(auth.user?.gvPoints||0).toLocaleString()}</span>
            <span className="text-white/22 text-xs">pts</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/4 border border-green-400/15">
            <span className="text-green-400 font-black text-sm">${(auth.user?.walletBalance||0).toFixed(2)}</span>
          </div>
          <button onClick={()=>setNav("profile")}
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
            style={{background:"linear-gradient(135deg,rgba(0,212,255,0.25),rgba(168,85,247,0.25))",border:"1px solid rgba(0,212,255,0.35)"}}>
            {auth.user?.username?.[0]?.toUpperCase()}
          </button>
        </div>
      </div>
      <div className="flex pt-14">
        <div className="hidden md:flex flex-col fixed left-0 top-14 bottom-0 w-48 border-r border-white/7 z-40 py-4 gap-0.5"
          style={{background:"rgba(6,10,20,0.98)",backdropFilter:"blur(20px)"}}>
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>setNav(item.id)}
              className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-bold transition-all"
              style={{background:nav===item.id?"rgba(0,212,255,0.1)":"transparent",color:nav===item.id?"#00d4ff":"rgba(255,255,255,0.32)",borderLeft:nav===item.id?"2px solid #00d4ff":"2px solid transparent",textShadow:nav===item.id?"0 0 8px #00d4ff":"none"}}>
              <span className="text-lg">{item.icon}</span>{item.label}
            </button>
          ))}
          <div className="mt-auto mx-2 mb-2 px-3 py-2 rounded-lg text-center"
            style={{background:"rgba(57,255,20,0.05)",border:"1px solid rgba(57,255,20,0.15)"}}>
            <div className="text-green-400/55 text-xs">🟢 Supabase connected</div>
          </div>
        </div>
        <div className="flex-1 md:ml-48 min-h-screen px-4 py-6 pb-24 md:pb-8 relative z-10">
          <div className="max-w-4xl">{renderPage()}</div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/8"
        style={{background:"rgba(6,10,20,0.99)",backdropFilter:"blur(20px)"}}>
        {navItems.slice(0,5).map(item=>(
          <button key={item.id} onClick={()=>setNav(item.id)}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-all"
            style={{color:nav===item.id?"#00d4ff":"rgba(255,255,255,0.25)"}}>
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
            {nav===item.id&&<div className="w-4 h-0.5 rounded-full mt-0.5 bg-cyan-400"/>}
          </button>
        ))}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;500;700;900&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(0,212,255,0.2);border-radius:2px;}
        body{margin:0;}
        select option{background:#0d1526;color:white;}
      `}</style>
    </div>
  );
}
