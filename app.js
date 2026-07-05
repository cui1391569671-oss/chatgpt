
function fallback(){
  document.getElementById("app").innerHTML = `
    <div style="padding:20px;color:#999">
      ⚠️ 新闻加载失败（网络或RSS问题）
    </div>`;
}

async function fetchRSS(url){
  try{
    const api = "https://api.allorigins.win/get?url=" + encodeURIComponent(url);
    const res = await fetch(api);
    const data = await res.json();
    if(!data.contents) return [];

    const xml = new DOMParser().parseFromString(data.contents,"text/xml");
    const items = [...xml.querySelectorAll("item")];

    return items.slice(0,5).map(i=>({
      title:i.querySelector("title")?.textContent || "",
      link:i.querySelector("link")?.textContent || "#"
    }));
  }catch(e){
    return [];
  }
}

function render(data){
  const app = document.getElementById("app");
  app.innerHTML = "";

  let hasData = false;

  for(const k in data){
    const list = data[k] || [];
    if(list.length) hasData = true;

    let html = `<div class='section-title'>${k}</div>`;

    list.forEach(n=>{
      html += `
        <div class='card'>
          <a href="${n.link}" target="_blank">${n.title}</a>
        </div>
      `;
    });

    const sec = document.createElement("div");
    sec.innerHTML = html;
    app.appendChild(sec);
  }

  if(!hasData){
    fallback();
  }
}

async function load(){
  const app = document.getElementById("app");
  app.innerHTML = "加载中...";

  if(!window.CONFIG?.feeds){
    fallback();
    return;
  }

  let data = {};

  for(const k in window.CONFIG.feeds){
    data[k] = await fetchRSS(window.CONFIG.feeds[k]);
  }

  render(data);
}

load();
setInterval(load, 60000);
