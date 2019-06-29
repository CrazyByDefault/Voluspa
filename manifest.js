const fs = require('fs');
const path = require('path');



async function loadManifest() {

  let directory = './cache/manifest/';
  let extension = 'json';

  let file = await fs.promises.readdir(directory, (_, dirlist) => {
    const latest = dirlist
      .map(_path => ({ stat: fs.lstatSync(path.join(directory, _path)), dir: _path }))
      .filter(_path => _path.stat.isFile())
      .filter(_path => (extension ? _path.dir.endsWith(`.${extension}`) : 1))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .map(_path => _path.dir);

  }).catch(err => {
    console.log(`20`, err)
  });

  let json = await fs.promises.readFile(`./cache/manifest/${file[0]}`);
  return JSON.parse(json);
}

module.exports = { loadManifest };