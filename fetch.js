const Parser = require('rss-parser');
const fs = require('fs');
const parser = new Parser();

const feeds = {
  hot: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  game: 'https://www.gamespot.com/feeds/mashup/',
  photo: 'https://petapixel.com/feed/',
  cook: 'https://www.seriouseats.com/rss'
};

(async ()=>{
  let out = {};
  for(let k in feeds){
    try{
      const feed = await parser.parseURL(feeds[k]);
      out[k] = feed.items.slice(0,5).map(i=>({title:i.title, link:i.link}));
    }catch(e){
      out[k]=[];
    }
  }
  fs.writeFileSync('news.json', JSON.stringify(out,null,2));
})();
