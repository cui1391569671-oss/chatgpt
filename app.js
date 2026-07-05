async function fetchRSS(url){
  const api = "https://api.allorigins.win/get?url=" + encodeURIComponent(url);
  try{
    const res = await fetch(api);
    const data = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = xml.querySelectorAll("item");

    return Array.from(items).slice(0,5).map(i=>({
      title: i.querySelector("title")?.textContent || "",
      link: i.querySelector("link")?.textContent || "#"
    }));
  }catch(e){
    return [];
  }
}

function summarize(t){
  return t && t.length>40 ? t.slice(0,40)+"..." : t;
}

async function load(){
  const app = document.getElementById("app");
  app.innerHTML = "";

  const feeds = window.CONFIG.feeds;

  let all = {};

  for(const k in feeds){
    all[k] = await fetchRSS(feeds[k]);
  }

  const hot = all.hot?.[0];

  if(hot){
    const hero = document.createElement("div");
    hero.className = "hero";
    hero.innerHTML = `
      <div class="hero-title">${hot.title}</div>
      <div class="hero-sub">${summarize(hot.title)}</div>
    `;
    app.appendChild(hero);
  }

  for(const k in all){
    let html = `<div class='section-title'>${k}</div>`;

    all[k].forEach(n=>{
      html += `
        <div class='card'>
          <a href='${n.link}' target='_blank'>${n.title}</a>
          <div class='meta'>${summarize(n.title)}</div>
        </div>
      `;
    });

    const sec = document.createElement("div");
    sec.innerHTML = html;
    app.appendChild(sec);
  }
}

load();
setInterval(load, 60000);
