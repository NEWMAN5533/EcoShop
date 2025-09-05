// CONSTANTS //
const slides = document.querySelector(".category-product");
const slide = document.querySelectorAll(".categories-container");

let index = 0;

function autoSlide() {
  index++;
  if (index >= slide.length) {
    index = 0;
  }
  slides.style.transform = `translateX(${-index * 300}px)`;
}

setInterval(autoSlide, 3000);

//  COPYRIGHT DATING //

document.getElementById('year-simple').textContent = new Date().getFullYear();