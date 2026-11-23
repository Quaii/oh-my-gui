import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchSiteLabel,webSources} from '../../web/src/lib/web-sources.ts';

test('native search uses the response sources and counts distinct sites',()=>{
 const sources=webSources({
  details:{response:{provider:'fixture',sources:[
   {title:'First',url:'https://www.example.com/first',snippet:'[Unrelated](https://elsewhere.test/)'},
   {title:'Second',url:'https://example.com/second'},
   {title:'Third',url:'https://another.test/third'},
   {title:'Duplicate',url:'https://another.test/third'},
   {title:'Unsafe',url:'javascript:alert(1)'},
  ]}},
  content:[{type:'text',text:'[Link quoted in result](https://unrelated.test/)'}],
 });
 assert.deepEqual(sources.map(source=>source.title),['First','Second','Third']);
 assert.equal(searchSiteLabel(sources),'Searched 2 sites');
});

test('saved numbered summaries recover search results without counting links in snippets',()=>{
 const sources=webSources({content:[{type:'text',text:'[1] First page\n    https://example.com/first\n    [Snippet link](https://unrelated.test/)\n[2] Second page\n    https://example.com/second'}]});
 assert.deepEqual(sources.map(source=>source.url),['https://example.com/first','https://example.com/second']);
 assert.equal(searchSiteLabel(sources),'Searched 1 site');
 assert.equal(searchSiteLabel(webSources({details:{response:{sources:[]}}})),'Search complete · no sources reported');
});

test('search source favicons use only a public website hostname', () => {
 const sources = webSources({sources: [
  {url: 'https://news.example.com/report?secret=sample#details', favicon: 'https://elsewhere.test/image.png'},
  {url: 'http://127.0.0.1:8080/local'},
  {url: 'https://project.internal/search'},
 ]});
 assert.deepEqual(sources.map(source => source.favicon), [
  '/api/browser-favicon?host=news.example.com', undefined, undefined,
 ]);
});
