// ✅ Set your custom deal end time here
  let dealEndTime = new Date("Sep 30, 2025 23:59:59").getTime();

  function updateCountdown() {
    let now = new Date().getTime();
    let distance = dealEndTime - now;

    if (distance < 0) {
      document.querySelector(".deal-timer").innerHTML = "Deal Expired!";
      return;
    }

    let days = Math.floor(distance / (1000 * 60 * 60 * 24));
    let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").innerHTML = days;
    document.getElementById("hours").innerHTML = hours;
    document.getElementById("minutes").innerHTML = minutes;
    document.getElementById("seconds").innerHTML = seconds;
  }

  // Run immediately and keep updating every second
  updateCountdown();
  setInterval(updateCountdown, 1000);


document.getElementById('year-simple').textContent = new Date().getFullYear();