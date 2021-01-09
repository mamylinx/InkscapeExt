function average(array) {
  //Calculate the average array contents
  var ay = 0,
    ax = 0;
  for (i in array) {
    ax += array[i][0];
    ay += array[i][1];
  }
  return [ax / array.length, ay / array.length];
}

function chunk(array, chunkSize) {
  //Split array and group element chunkSize by chunkSize
  var R = [];
  for (var i = 0; i < array.length; i += chunkSize)
    R.push(array.slice(i, i + chunkSize));
  return R;
}

function sanitizePathData(array) {
  let o = [],
    i = 0;
  while (i < array.length) {
    let e = array[i];
    o.push(e.type.toUpperCase(),
      e.x1 !== undefined ? e.x1.toFixed(2) : undefined,
      e.y1 !== undefined ? e.y1.toFixed(2) : undefined,
      e.x !== undefined ? e.x.toFixed(2) : undefined,
      e.y !== undefined ? e.y.toFixed(2) : undefined
    );
    i++;
  }
  return o.filter(e => e !== undefined).join(" ");
}

function getDataPath(svg) {
  //Parse svg and return the content of d attribute from <path />
  let d = svg.match(/\sd=\"(.*?)\"\s/i)[1];
  return d;
}
module.exports = {
  average,
  chunk,
  sanitizePathData,
  getDataPath
};
