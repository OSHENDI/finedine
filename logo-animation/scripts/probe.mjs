import sharp from 'sharp';
const {data,info}=await sharp('source.jpg').raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,C=info.channels;
const px=(x,y)=>{const i=(y*W+x)*C;return [data[i],data[i+1],data[i+2]]};
console.log(W,H,C,'corner',px(5,5),px(1000,1950),'pink',px(700,600),'yellow',px(900,650),'text',px(470,1350));
// rows with strong pink/yellow: report row ranges
const strong=(r,g,b)=> (r-b>60 && r-g>60) ; // pink
const yel=(r,g,b)=> (r>200&&g>170&&b<120);
let prev=false,start=0;
for(let y=0;y<H;y++){let c=0,minx=W,maxx=0;for(let x=0;x<W;x++){const [r,g,b]=px(x,y);if(strong(r,g,b)||yel(r,g,b)){c++;minx=Math.min(minx,x);maxx=Math.max(maxx,x)}}
 const on=c>3; if(on&&!prev)start=y; if(!on&&prev)console.log('band',start,y-1); prev=on;}
