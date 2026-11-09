let matn = "sevimli mashgulot"; 
let harf = "s"; 
let s = 0;

for (let i = 0; i < matn.length; i++) {
  if (matn[i] === harf) {
    s = s + 1;
  }
}

console.log(harf + " harfi " + s + " marta");