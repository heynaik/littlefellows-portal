"use client";
import { useState } from "react";

export default function SettingsPage(){
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [publish, setPublish] = useState(false);
  const [lang, setLang] = useState("Auto");

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      {/* Left rail */}
      <div className="card p-3 sticky top-20 h-fit">
        <div className="text-sm font-medium mb-2">Settings</div>
        <ul className="space-y-1 text-sm">
          <li className="rounded-md bg-slate-50 px-3 py-2">General</li>
          <li className="rounded-md px-3 py-2 text-slate-500">Profile</li>
          <li className="rounded-md px-3 py-2 text-slate-500">Security</li>
          <li className="rounded-md px-3 py-2 text-slate-500">Notifications</li>
          <li className="rounded-md px-3 py-2 text-slate-500">Subscription</li>
        </ul>
      </div>

      {/* Panel */}
      <div className="space-y-4">
        <div className="card p-5">
          <h1 className="text-xl font-semibold mb-4">General</h1>

          <div className="grid gap-4">
            <Row label="Enable auto-prompt idea suggestion">
              <Toggle on={autoSuggest} setOn={setAutoSuggest} />
            </Row>

            <Row label="Auto-play preview videos">
              <Toggle on={autoPlay} setOn={setAutoPlay} />
            </Row>

            <Row label="Publish to Explore">
              <Toggle on={publish} setOn={setPublish} />
            </Row>

            <Row label="Language">
              <select className="select" value={lang} onChange={e=>setLang(e.target.value)}>
                <option>Auto</option><option>English</option><option>Hindi</option>
              </select>
            </Row>

            <div>
              <button className="btn">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({label, children}:{label:string;children:React.ReactNode}){
  return (
    <div className="grid md:grid-cols-[260px_1fr] items-center gap-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({on,setOn}:{on:boolean; setOn:(v:boolean)=>void}){
  return (
    <button
      className={`h-6 w-11 rounded-full border transition ${on?"bg-indigo-600 border-indigo-600":"bg-slate-200 border-slate-200"}`}
      onClick={()=>setOn(!on)}
      aria-pressed={on}
    >
      <span className={`block h-5 w-5 bg-white rounded-full translate-x-[2px] transition ${on?"translate-x-[22px]":""}`} />
    </button>
  );
}