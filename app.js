async function load(){
  const res = await fetch('./news.json');
  const data = await res.json();

  let html = '';

  for(const k in data){
    html += `<h3>${k}</h3>`;
    data[k].forEach(n=>{
      html += `<div class='card'><a href='${n.link}' target='_blank'>${n.title}</a></div>`;
    });
  }

  document.getElementById('app').innerHTML = html;
}
load();
setInterval(load,60000);
