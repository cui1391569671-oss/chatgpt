async function load(){
  const res = await fetch('./news.json');
  const data = await res.json();

  const app = document.getElementById('app');
  app.innerHTML = '';

  for(const key in data){
    let html = `<div class='section-title'>${key}</div>`;

    data[key].forEach(item=>{
      html += `
        <div class='card'>
          <a href='${item.link}' target='_blank'>${item.title}</a>
        </div>
      `;
    });

    const section = document.createElement('div');
    section.innerHTML = html;
    app.appendChild(section);
  }
}

load();
setInterval(load, 60000);
