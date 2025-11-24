let currentIndex = 0;
const slides = document.getElementById("slides");
const totalSlides = slides.children.length;
let isTransitioning = false;

slides.style.display = "flex";
slides.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";

// Clone slides: add one set before and one set after for seamless infinite loop
const originalSlides = Array.from(slides.children);

// Add clones at the end
originalSlides.forEach(slide => {
    slides.appendChild(slide.cloneNode(true));
});

// Add clones at the beginning
originalSlides.reverse().forEach(slide => {
    slides.insertBefore(slide.cloneNode(true), slides.firstChild);
});

const allSlides = slides.children.length;

// Set widths
slides.style.width = `${allSlides * 100}%`;
Array.from(slides.children).forEach(slide => {
    slide.style.width = `${100 / allSlides}%`;
    slide.style.flexShrink = "0";
});

// Start at the first real slide (after the prepended clones)
currentIndex = totalSlides;
slides.style.transform = `translateX(-${currentIndex * (100 / allSlides)}%)`;

// Move slides
function updateSlide(animate = true) {
    if (animate) {
        slides.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    } else {
        slides.style.transition = "none";
    }
    slides.style.transform = `translateX(-${currentIndex * (100 / allSlides)}%)`;
}

// Handle seamless looping
slides.addEventListener("transitionend", () => {
    isTransitioning = false;
    
    // If we're past the last real slide, jump to the first real slide
    if (currentIndex >= totalSlides * 2) {
        currentIndex = totalSlides;
        updateSlide(false);
    }
    // If we're before the first real slide, jump to the last real slide
    else if (currentIndex < totalSlides) {
        currentIndex = totalSlides * 2 - 1;
        updateSlide(false);
    }
});

function nextSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex++;
    updateSlide(true);
}

function prevSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex--;
    updateSlide(true);
}

document.getElementById("next-slide").addEventListener("click", nextSlide);
document.getElementById("prev-slide").addEventListener("click", prevSlide);