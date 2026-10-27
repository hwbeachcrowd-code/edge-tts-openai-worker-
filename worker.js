const VOICE_HOST = "api.msedgeservices.com";
const VOICE_PATH = "/tts/cognitiveservices/websocket/v1";
const VOICE_LIST_URL = "https://api.msedgeservices.com/tts/cognitiveservices/voices/list";
const SUBSCRIPTION_KEY = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const GEC_VERSION = "2-155.0.4283.45";

const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural";

const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Edge TTS 在线语音</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:24px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f3f6fb;color:#172033}
main{max-width:760px;margin:auto}
.card{background:white;border-radius:18px;padding:24px;margin:16px 0;box-shadow:0 6px 24px #16294b12}
h1{margin:0 0 8px;font-size:28px}
p{line-height:1.7;color:#5b6578}
label{display:block;margin:16px 0 7px;font-weight:600}
textarea,select,input{width:100%;padding:12px;border:1px solid #d4dbe7;border-radius:10px;font:inherit;background:white}
textarea{min-height:150px;resize:vertical}
button{border:0;border-radius:10px;padding:12px 18px;background:#2563eb;color:white;font:inherit;cursor:pointer}
button:disabled{opacity:.5}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.secondary{background:#e8eef9;color:#183153}
audio{width:100%;margin-top:18px}
.small{font-size:13px;word-break:break-all}
#status{white-space:pre-wrap;margin-top:14px}
</style>
</head>
<body>
<main>
<div class="card">
<h1>🎧 Edge TTS 在线语音</h1>
<p>使用微软 Edge 在线语音合成。可以试听语音，也可以生成 Legado（阅读）TTS 导入配置。</p>
<label for="voice">选择语音</label>
<select id="voice">
<option value="zh-CN-XiaoxiaoNeural">晓晓（普通话女声）</option>
<option value="zh-CN-YunxiNeural">云希（普通话男声）</option>
<option value="zh-CN-YunyangNeural">云扬（普通话男声）</option>
<option value="zh-CN-XiaoyiNeural">晓伊（普通话女声）</option>
<option value="zh-CN-YunjianNeural">云健（普通话男声）</option>
<option value="zh-CN-XiaochenNeural">晓辰（普通话女声）</option>
<option value="zh-CN-XiaohanNeural">晓涵（普通话女声）</option>
<option value="zh-CN-XiaomengNeural">晓梦（普通话女声）</option>
<option value="zh-CN-XiaomoNeural">晓墨（普通话女声）</option>
<option value="zh-CN-XiaoqiuNeural">晓秋（普通话女声）</option>
<option value="zh-CN-XiaoruiNeural">晓睿（普通话女声）</option>
<option value="zh-CN-XiaoshuangNeural">晓双（普通话女声）</option>
<option value="zh-CN-XiaoxuanNeural">晓萱（普通话女声）</option>
<option value="zh-CN-XiaoyanNeural">晓颜（普通话女声）</option>
<option value="zh-CN-XiaoyouNeural">晓悠（普通话女声）</option>
<option value="zh-CN-XiaozhenNeural">晓珍（普通话女声）</option>
<option value="zh-TW-HsiaoChenNeural">晓臻（台湾国语女声）</option>
<option value="zh-TW-YunJheNeural">云哲（台湾国语男声）</option>
<option value="zh-HK-HiuGaaiNeural">晓佳（粤语女声）</option>
<option value="zh-HK-WanLungNeural">云龙（粤语男声）</option>
</select>
<label for="text">要朗读的文本</label>
<textarea id="text" placeholder="请输入需要朗读的内容……">你好，欢迎使用 Edge TTS 在线语音合成。</textarea>
<div class="actions">
<button id="speak">开始合成</button>
<button class="secondary" id="download">下载音频</button>
</div>
<audio id="audio" controls></audio>
<div id="status"></div>
</div>
<div class="card">
<h2>📚 Legado（阅读）导入</h2>
<p>点击下面的按钮，尝试通过导入链接将 TTS 配置添加到阅读。若应用版本不支持该导入协议，可手动导入 JSON 配置。</p>
<div class="actions">
<button id="import">打开阅读导入链接</button>
<button class="secondary" id="copy">复制配置地址</button>
</div>
<p class="small" id="config"></p>
<p class="small">接口：/legado.json</p>
</div>
<div class="card">
<h2>🔧 接口状态</h2>
<p><a href="/health">健康状态</a> · <a href="/voices">语音列表</a> · <a href="/legado.json">Legado 配置 JSON</a></p>
</div>
</main>
<script>
const $=id=>document.getElementById(id);
let audioUrl="";
const configUrl=location.origin+"/legado.json";
$("config").textContent=configUrl;
$("speak").onclick=async()=>{
 const text=$("text").value.trim();
 if(!text){$("status").textContent="请先输入文本。";return;}
 $("speak").disabled=true;
 $("status").textContent="正在请求语音合成……";
 try{
  const r=await fetch("/v1/audio/speech",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({input:text,voice:$("voice").value})
  });
  if(!r.ok)throw new Error(await r.text());
  const blob=await r.blob();
  if(audioUrl)URL.revokeObjectURL(audioUrl);
  audioUrl=URL.createObjectURL(blob);
  $("audio").src=audioUrl;
  $("status").textContent="合成完成。";
  $("audio").play().catch(()=>{});
 }catch(e){$("status").textContent="合成失败："+e.message;}
 finally{$("speak").disabled=false;}
};
$("download").onclick=()=>{
 if(!audioUrl){$("status").textContent="请先合成音频。";return;}
 const a=document.createElement("a");
 a.href=audioUrl;a.download="edge-tts.mp3";a.click();
};
$("copy").onclick=async()=>{
 try{await navigator.clipboard.writeText(configUrl);$("status").textContent="配置地址已复制。";}
 catch(e){$("status").textContent=configUrl;}
};
$("import").onclick=()=>{
 const url="legado://import/httpTTS?src="+encodeURIComponent(configUrl);
 location.href=url;
};
</script>
</body>
</html>`;

function json(data, status=200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  };
}

function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(data) {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      typeof data === "string" ? new TextEncoder().encode(data) : data
    )
  );
}

function rotl(x, n) {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function rotr(x, n) {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

const SHA256_INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

const SHA256_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,
  0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
  0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,
  0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
  0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
  0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,
  0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,
  0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
  0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];

function sha256Pure(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const dv = new DataView(padded.buffer);
  const high = Math.floor(bitLen / 0x100000000);
  const low = bitLen >>> 0;
  dv.setUint32(paddedLen - 8, high);
  dv.setUint32(paddedLen - 4, low);

  const h = SHA256_INITIAL.slice();
  const w = new Uint32Array(64);

  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = dv.getUint32(off + i * 4);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }

    let [a,b,c,d,e,f,g,hh] = h;
    for (let i=0;i<64;i++) {
      const S1=rotr(e,6)^rotr(e,11)^rotr(e,25);
      const ch=(e&f)^(~e&g);
      const t1=(hh+S1+ch+SHA256_K[i]+w[i])>>>0;
      const S0=rotr(a,2)^rotr(a,13)^rotr(a,22);
      const maj=(a&b)^(a&c)^(b&c);
      const t2=(S0+maj)>>>0;
      hh=g;g=f;f=e;e=(d+t1)>>>0;
      d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;
    h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;
    h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;
    h[6]=(h[6]+g)>>>0;h[7]=(h[7]+hh)>>>0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((v,i)=>outView.setUint32(i*4,v));
  return out;
}

function sha256Hex(data) {
  return [...sha256Pure(data)]
    .map(x=>x.toString(16).padStart(2,"0"))
    .join("");
}

function getTicks() {
  return BigInt(Date.now() + 11644473600000) * 10000n;
}

function getSecMsGec() {
  const ticks = getTicks();
  const rounded = ticks - ticks % 300000000n;
  const str = rounded.toString();
  const hash = sha256Hex(str + SUBSCRIPTION_KEY);
  return hash.toUpperCase();
}

function makeTimestamp() {
  return new Date().toISOString();
}

function makeSSML(text, voice) {
  const escaped = String(text)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");

  return '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' +
    voice.split("-").slice(0,2).join("-") +
    '"><voice name="' + voice + '">' + escaped + '</voice></speak>';
}

async function synthesize(text, voice) {
  const secMsGec = getSecMsGec();
  const connectionId = crypto.randomUUID().replace(/-/g, "");
  const url = "wss://" + VOICE_HOST + VOICE_PATH +
    "?Ocp-Apim-Subscription-Key=" + SUBSCRIPTION_KEY +
    "&Sec-MS-GEC=" + secMsGec +
    "&Sec-MS-GEC-Version=" + encodeURIComponent(GEC_VERSION) +
    "&ConnectionId=" + connectionId;

  const ws = new WebSocket(url);
  const chunks = [];
  let settled = false;
  let timer;

  return await new Promise((resolve,reject)=>{
    function finish(err) {
      if (settled) return;
      settled=true;
      clearTimeout(timer);
      try{ws.close();}catch{}
      if(err) reject(err);
      else resolve(new Blob(chunks,{type:"audio/mpeg"}));
    }

    timer=setTimeout(()=>finish(new Error("语音合成超时")),30000);

    ws.addEventListener("open",()=>{
      const config = JSON.stringify({
        context:{
          synthesis:{
            audio:{
              metadataoptions:{
                sentenceBoundaryEnabled:"false",
                wordBoundaryEnabled:"false"
              },
              outputFormat:"audio-24khz-48kbitrate-mono-mp3"
            }
          }
        }
      });

      ws.send("Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"+config);

      const requestId=crypto.randomUUID().replace(/-/g,"");
      const ssml=makeSSML(text,voice);
      const request =
        "X-RequestId:"+requestId+"\r\n"+
        "Content-Type:application/ssml+xml\r\n"+
        "X-Timestamp:"+makeTimestamp()+"Z\r\n"+
        "Path:ssml\r\n\r\n"+ssml;

      ws.send(request);
    });

    ws.addEventListener("message",async event=>{
      try{
        const data=event.data;
        if(typeof data==="string"){
          const idx=data.indexOf("\r\n\r\n");
          const header=idx>=0?data.slice(0,idx):data;
          if(header.includes("Path:turn.end")){
            finish();
          }else if(header.includes("Path:response")){
            if(/401|403|429|500/.test(header)){
              finish(new Error("微软语音服务返回错误："+header));
            }
          }
        }else if(data instanceof ArrayBuffer){
          const u=new Uint8Array(data);
          let split=-1;
          for(let i=0;i<u.length-1;i++){
            if(u[i]===13&&u[i+1]===10){split=i+2;break;}
          }
          if(split!==-1&&split+2<u.length){
            let headerText="";
            try{headerText=new TextDecoder().decode(u.slice(0,split));}catch{}
            const marker=u.indexOf(0,split);
            const bodyStart=marker>=0?marker+1:split;
            if(headerText.includes("Path:audio")||headerText.includes("audio")){
              chunks.push(u.slice(bodyStart));
            }else{
              chunks.push(u.slice(split));
            }
          }
        }else if(data instanceof Blob){
          chunks.push(new Uint8Array(await data.arrayBuffer()));
        }
      }catch(e){finish(e);}
    });

    ws.addEventListener("error",()=>finish(new Error("WebSocket 连接微软语音服务失败")));
    ws.addEventListener("close",()=>{
      if(!settled){
        if(chunks.length)finish();
        else finish(new Error("连接关闭，未收到音频数据"));
      }
    });
  });
}

async function getVoices() {
  const r=await fetch(VOICE_LIST_URL,{
    headers:{
      "Ocp-Apim-Subscription-Key":SUBSCRIPTION_KEY,
      "User-Agent":"Mozilla/5.0"
    }
  });
  if(!r.ok)throw new Error("获取语音列表失败："+r.status);
  return await r.json();
}

function legadoConfig(origin) {
  const url=origin+"/legado-tts";
  return [
    {
      name:"Edge TTS 中文女声（晓晓）",
      url:url+"?text={{java.encodeURI(speakText)}}&voice=zh-CN-XiaoxiaoNeural",
      contentType:"audio/mpeg",
      concurrentRate:1,
      loginUrl:"",
      header:{},
      loginCheckJs:"",
      loginUi:"",
      jsLib:"",
      enabled:true
    },
    {
      name:"Edge TTS 中文男声（云希）",
      url:url+"?text={{java.encodeURI(speakText)}}&voice=zh-CN-YunxiNeural",
      contentType:"audio/mpeg",
      concurrentRate:1,
      loginUrl:"",
      header:{},
      loginCheckJs:"",
      loginUi:"",
      jsLib:"",
      enabled:true
    }
  ];
}

export default {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    const path=url.pathname;

    if(request.method==="OPTIONS"){
      return new Response(null,{status:204,headers:corsHeaders()});
    }

    if(path==="/"||path==="/index.html"){
      return new Response(HTML,{
        headers:{
          "Content-Type":"text/html; charset=utf-8",
          "Cache-Control":"no-store"
        }
      });
    }

    if(path==="/health"){
      return json({ok:true,service:"edge-tts-worker",time:new Date().toISOString()});
    }

    if(path==="/health/tts"){
      return json({ok:true,endpoint:"api.msedgeservices.com",voice:DEFAULT_VOICE});
    }

    if(path==="/legado.json"){
      return json(legadoConfig(url.origin));
    }

    if(path==="/voices"){
      try{
        const voices=await getVoices();
        return json(voices);
      }catch(e){
        return json({error:e.message},502);
      }
    }

    if(path==="/legado-tts"){
      const text=url.searchParams.get("text")||"";
      const voice=url.searchParams.get("voice")||DEFAULT_VOICE;

      if(!text.trim())return new Response("Missing text",{status:400,headers:corsHeaders()});
      if(text.length>5000)return new Response("Text too long",{status:413,headers:corsHeaders()});

      try{
        const audio=await synthesize(text,voice);
        return new Response(audio,{
          headers:{
            ...corsHeaders(),
            "Content-Type":"audio/mpeg",
            "Cache-Control":"no-store"
          }
        });
      }catch(e){
        return new Response("TTS error: "+e.message,{status:502,headers:corsHeaders()});
      }
    }

    if(path==="/tts"||path==="/v1/audio/speech"){
      if(request.method!=="POST"){
        return json({error:"Method Not Allowed"},405);
      }

      let body;
      try{body=await request.json();}
      catch{return json({error:"Invalid JSON"},400);}

      const text=body.input||body.text||"";
      const voice=body.voice||DEFAULT_VOICE;

      if(typeof text!=="string"||!text.trim()){
        return json({error:"input/text is required"},400);
      }
      if(text.length>5000){
        return json({error:"Text too long (max 5000 characters)"},413);
      }

      try{
        const audio=await synthesize(text,voice);
        return new Response(audio,{
          headers:{
            ...corsHeaders(),
            "Content-Type":"audio/mpeg",
            "Cache-Control":"no-store"
          }
        });
      }catch(e){
        return json({error:e.message},502);
      }
    }

    return json({error:"Not Found",path},404);
  }
};
