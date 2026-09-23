const progressBars = document.querySelectorAll('.ul-progressbar');
progressBars.forEach(progressBar => {
    const targetValue = parseInt(progressBar.getAttribute('data-ul-progress-value'), 10);
    const progressLabelPercent = progressBar.querySelector(".ul-progress-label .percent");
    let currentValue = 0;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const updateProgressBar = () => {
                    if (currentValue < targetValue) {
                        currentValue++;
                        // progressBar.style.width = `${currentValue}%`;
                        progressBar.style.setProperty('--progress-value', `${currentValue}%`);
                        progressLabelPercent.textContent = `${currentValue}%`;
                        requestAnimationFrame(updateProgressBar);
                    }
                };

                updateProgressBar();
                observer.unobserve(progressBar);
            }
        });
    });

    observer.observe(progressBar);
});