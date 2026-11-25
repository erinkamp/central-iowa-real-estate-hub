import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const PORT=process.env.PORT||3000;
const sources=[
 {name:'Google News · DMAAR',url:'https://news.google.com/rss/search?q=site%3Admaar.com+housing+market+statistics&hl=en-US&gl=US&ceid=US:en',home:'https://www.dmaar.com/',category:'Association Updates'},
 {name:'Google News · Iowa REALTORS',url:'https://news.google.com/rss/search?q=site%3Aiowarealtors.com+housing+real+estate&hl=en-US&gl=US&ceid=US:en',home:'https://iowarealtors.com/',category:'Association Updates'},
 {name:'Business Record',url:'https://www.businessrecord.com/feed/',home:'https://www.businessrecord.com/',category:'Development'},
 {name:'Google News · Central Iowa Housing',url:'https://news.google.com/rss/search?q=Des+Moines+Iowa+housing+market+real+estate&hl=en-US&gl=US&ceid=US:en',home:'https://news.google.com/search?q=Des%20Moines%20Iowa%20housing%20market',category:'Local News'},
 {name:'Google News · Iowa Development',url:'https://news.google.com/rss/search?q=West+Des+Moines+Waukee+Clive+Iowa+development+construction&hl=en-US&gl=US&ceid=US:en',home:'https://news.google.com/search?q=West%20Des%20Moines%20development',category:'Development'},
 {name:'Google News · Mortgage',url:'https://news.google.com/rss/search?q=mortgage+rates+housing+finance+Iowa&hl=en-US&gl=US&ceid=US:en',home:'https://news.google.com/search?q=mortgage%20rates%20Iowa',category:'Financing'}
];
// Keep the broad Business Record feed focused on housing and the built environment.
const realEstateTerms=/\b(real estate|realtor|housing|homes?|homebuyers?|homeowners?|residential|apartments?|condos?|townhomes?|subdivisions?|mortgages?|property tax|property taxes|zoning|rezoning|land use|homebuilding|homebuilders?|housing starts|housing permits|building permits|affordable housing|rental housing|rentals?|housing development|mixed.use development|redevelopment|commercial property|commercial real estate|office space|retail space|industrial park|construction|neighborhood|urban renewal|housing market|home sales|home prices|inventory|interest rates)\b/i;
const links=[
 {name:'DMAAR Housing Statistics',url:'https://www.dmaar.com/news/housing-stats',category:'Market Data',frequency:'Monthly'},
 {name:'DMAAR News & Updates',url:'https://www.dmaar.com/',category:'Association Updates',frequency:'As published'},
 {name:'Iowa REALTORS News',url:'https://iowarealtors.com/',category:'Association Updates',frequency:'As published'},
 {name:'Iowa REALTORS Housing Statistics',url:'https://iowarealtors.com/housing-stats',category:'Market Data',frequency:'Monthly'},
 {name:'Freddie Mac PMMS',url:'https://www.freddiemac.com/pmms',category:'Financing',frequency:'Weekly'},
 {name:'Iowa Finance Authority',url:'https://www.iowafinance.com/',category:'Financing',frequency:'As published'},
 {name:'National Association of REALTORS',url:'https://www.nar.realtor/',category:'Professional',frequency:'As published'},
 {name:'Business Record',url:'https://www.businessrecord.com/',category:'Development',frequency:'Daily'}
];
function decode(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]+>/g,'').trim()}
function tag(s,n){return (s.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${n}>`,'i'))||[])[1]||''}
function parse(xml,source){const items=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);return items.slice(0,35).map(it=>({title:decode(tag(it,'title')),url:decode(tag(it,'link')),date:tag(it,'pubDate'),source:source.name,category:source.category})).filter(x=>x.title&&/^https?:\/\//.test(x.url)&&(source.name!=='Business Record'||realEstateTerms.test(x.title)))}
let cache={time:0,items:[],statuses:[]};
let lesCache={time:0,data:null};
async function lesLatest(){
 if(lesCache.data&&Date.now()-lesCache.time<60*60*1000)return lesCache.data;
 const archive='https://desmoinesmarketvalues.com/2026-youtube-videos';
 const fallback={title:'SimplyDesMoines Market Values',videoUrl:null,archive,updated:false};
 try{
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),6500);
  let html;
  try{const response=await fetch(archive,{signal:ctrl.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; CentralIowaRealEstateHub/1.0)'}});if(!response.ok)throw Error('Archive unavailable');html=await response.text()}finally{clearTimeout(timer)}
  // The official archive displays its most recent episode first. Match the first embedded YouTube player.
  const embed=html.match(/(?:youtube(?:-nocookie)?\\.com\\/embed\\/|youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([A-Za-z0-9_-]{11})/i);
  const heading=html.match(/Week\\s*\\d+\\s*,?\\s*2026\\s*[-–:]\\s*([^<\\r\\n]{8,180})/i);
  const data={...fallback,title:heading?heading[0].replace(/&amp;/g,'&').trim():fallback.title,videoUrl:embed?'https://www.youtube-nocookie.com/embed/'+embed[1]:null,updated:!!embed};
  lesCache={time:Date.now(),data};return data;
 }catch{lesCache={time:Date.now(),data:fallback};return fallback}
}

async function news(){if(Date.now()-cache.time<20*60*1000)return cache;const results=await Promise.all(sources.map(async s=>{try{const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),7000);try{const r=await fetch(s.url,{headers:{'User-Agent':'CentralIowaRealEstateHub/0.1 (personal learning aggregator)','Accept':'application/rss+xml, application/xml, text/xml'},signal:ctrl.signal});if(!r.ok)throw Error('HTTP '+r.status);const items=parse(await r.text(),s);return {items,status:{source:s.name,ok:items.length>0,count:items.length}}}finally{clearTimeout(timer)}}catch(e){return {items:[],status:{source:s.name,ok:false,error:'Feed unavailable'}}}}));const items=results.flatMap(x=>x.items);
const priority=x=>x.source.includes('DMAAR')?0:x.source.includes('Iowa REALTORS')?1:x.source.includes('Central Iowa Housing')?2:x.source.includes('Iowa Development')?3:x.source==='Business Record'?4:5;
if(items.length||!cache.items.length)cache={time:Date.now(),items:items.sort((a,b)=>priority(a)-priority(b)||new Date(b.date)-new Date(a.date)).slice(0,80),statuses:results.map(x=>x.status)};else cache={...cache,time:Date.now(),statuses:results.map(x=>x.status)};return cache}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/api/les'){const data=await lesLatest();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=900'});return res.end(JSON.stringify(data))}if(u.pathname==='/api/news'){const data=await news();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300'});return res.end(JSON.stringify({...data,links}))}let p=u.pathname==='/'?'/index.html':u.pathname;if(!['/index.html','/app.js','/briefs.js','/styles.css','/manifest.webmanifest','/icon.svg','/erin-kamp-logo.jpg','/rainbow-real-estate-icon.png'].includes(p)){res.writeHead(404);return res.end('Not found')}const body=await fs.readFile(path.join(process.cwd(),p));res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/json'});res.end(body)}catch(e){res.writeHead(500);res.end('Server error')}}).listen(PORT,()=>console.log(`Hub running at http://localhost:${PORT}`));
