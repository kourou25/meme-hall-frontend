// Small theme emblems share one inline box; their paths never affect text layout.
const paths={
 newcomer:'M12 21V11M12 14C3 15 3 6 3 6s9-1 9 8ZM12 11C12 3 21 3 21 3s1 8-9 8Z',
 mona:'M12 18C2 17 3 10 3 10s6 0 9 8Zm0 0c10-1 9-8 9-8s-6 0-9 8ZM12 18C5 11 12 3 12 3s7 8 0 15ZM5 21h14',
 lace:'M5 20c-5-4 0-9 4-7l4 3c6 1 8-5 4-8-3-2-5 2-2 3M5 17l5-2M8 20l4-3M17 8V4l4 1',
 giant:'M7 3c-5 10 2 18 11 16C8 16 9 8 10 5L7 3ZM7 3l1-2',
 worship:'M6 8c-3 9 5 14 13 10C9 17 9 12 10 8H6ZM5 3h9M4 6l-2 2M18 3l2 2',
 muscle:'M3 17V9l3-3 4 2-2 4 3 1 2-3 5 1 3 4-2 5H7l-4-3ZM6 7l2-3',
 deepseek:'M2 12c3-7 15-8 17-1l3-3v8l-3-2c-4 7-14 7-17-2ZM7 11h.1M12 6V3m-3 1 3-2 3 2',
 deepseekupgrade:'M3 13c3-6 11-6 14-1l5-4v9l-5-3c-3 6-12 6-14-1ZM6 6l3-3 3 3 3-3 3 3M8 12h.1',
 maid:'M12 10C5 1 0 8 4 14l8-4Zm0 0c7-9 12-2 8 4l-8-4ZM10 12l-3 9 5-3 5 3-3-9',
 whalepunch:'M3 15c3-6 10-6 13-1l6-3v9l-6-3c-5 4-11 3-13-2ZM9 2 6 8h5l-2 5 8-8h-5l2-3',
 nightdevil:'M6 8 3 3l1 10M18 8l3-5-1 10M4 11c2-7 14-7 16 0v3c0 8-16 8-16 0v-3ZM8 12l2 1m4 0 2-1M9 17q3 2 6 0',
 whalebuddy:'M2 13c2-7 13-8 16-2l4-4v10l-4-3c-3 7-14 7-16-1ZM7 11h.1M10 4l2 2 2-2',
 gpt:'M3 18c8 6 17-1 13-8l5 1-5-5 1-4-5 3-6-1 1 5-4 4 6-1-1 6M12 8h.1M10 15l5 3',
 claude:'M12 10c-8-10-12 4-3 3-10 7 4 12 4 3 8 9 12-5 3-4 7-9-7-13-4-2ZM12 11v3M10 12h4',
 gemini:'M7 3l2 5 5 2-5 2-2 5-2-5-4-2 4-2 2-5ZM17 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z',
 whitedragon:'M3 19 6 5l6 3 6-3 3 14-9-4-9 4ZM6 5 7 1l5 3 5-3 1 4M8 11l1 1m6 0 1-1',
 rascal:'M4 9 2 4l6 2M16 6l6-2-2 5M4 10c2-5 14-5 16 0v6c-3 6-13 6-16 0v-6ZM7 12h3m4 0h3M8 17l8-2',
 weirdo:'M4 5q8-4 16 0v11q-8 10-16 0V5ZM7 9h3m5-1 2 3M7 16q5-6 10 0',
 blacksilk:'M4 22C1 10 10 2 21 2c0 10-8 18-17 20ZM4 22 17 6M6 15l8 1M9 10l8 1',
 loli:'M8 11C0-2 12-1 10 10m4 0C12-1 24-2 16 11M5 16c0-9 14-9 14 0s-14 9-14 0ZM9 15h.1m6 0h.1',
 electric:'M13 2 3 14h8l-1 8 11-13h-8l0-7Z',
 railcannon:'M2 16 13 5l4 4L6 20l-4-4ZM10 20 19 11l3 3-9 9-3-3ZM3 17l3 3M11 21l2 2M15 3l3-1 4 5-1 3',
 chickengun:'M2 14h12V9l7 2-3 5H8l-3 5H2l3-7ZM3 10h8M14 6l2-3M19 7l3-1',
 blade:'M6 22 3 19l5-5 2 2-4 6ZM8 13C13 9 15 4 20 2c2 8-2 13-8 16l-4-5Z',
 spear:'M3 22 15 10M14 11l-1-5 8-4-3 8-4 1ZM10 13l4 4',
 sword:'M3 21 8 16M5 14l5 5M8 14 17 3l4-1-1 4-10 10',
 halberd:'M5 22 18 2M12 7l-4 1 2 7 8 1 1-4M13 5l8 6M8 16l5 4',
 snow:'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M18 19l-1-4 4-1',
 moon:'M18 3C5-1-2 13 8 20c6 4 13 0 14-5C12 20 6 9 18 3Z',
 wind:'M2 6h12c7 0 7-6 2-4M2 11h17c5 0 5 7 0 6M5 16h7c6 0 5 7 1 5',
 flower:'M12 9c-7-11-13 3-4 3-10 7 4 13 4 4 7 10 13-4 4-4 9-7-5-13-4-3ZM12 17v6m0-2 5-2',
 sun:'M8 8q4-4 8 0t0 8q-4 4-8 0T8 8ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
 star:'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6ZM12 8v5',
 cloud:'M6 19C-1 17 1 9 7 10 7 2 19 2 19 11c7 1 5 8-1 8H6ZM7 22h9'
}
export function titleSymbol(id,doc=document){
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('rt-title-emblem');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.dataset.theme=id
 const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[id]||paths.star);svg.append(path);return svg
}
