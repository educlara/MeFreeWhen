
/* Direction */
alert('1. Please select which time slots throughout the week you are available to have a 50-minute precept for SML312.\n2. Once you\'ve made your selections, go to the bottom of the page and enter your NetID and click "Submit".\n3. If you made a mistake in your selections, you can just reselect your correct availabilities and then resubmit with your NetID.');

const selectedSlots = new Set();
let sortedSchedule = [];
const selectedListElement = document.getElementById('selectedList');
const timeslotsForm = document.getElementById('timeslotsForm');
const submitBtn = document.getElementById('submitBtn');
const netIdInput = document.getElementById('netIdInput');

const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function parseTime(str) {
    // Extract day and start time (before "–")
    let [day] = str.split(" ", 1);
    let timeStr = str.slice(day.length + 1).split("–")[0].trim();

    // Match parts: hour, minute, AM/PM
    let [_, hour, minute, period] = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);

    hour = parseInt(hour, 10);
    minute = parseInt(minute, 10);

    // Convert to 24h
    if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

    let totalMinutes = hour * 60 + minute;

    return { day, start: totalMinutes };
}

function updateSelectedDisplay() {
    if (selectedSlots.size === 0) {
        selectedListElement.innerHTML = '<span style="color: #7f8c8d; font-style: italic;">No slots selected</span>';
        timeslotsForm.style.display = 'none'; // Hide form when no slots selected
    } else {

        // Sort selected slots
        sortedSchedule = [...selectedSlots].sort((a, b) => {
            let A = parseTime(a);
            let B = parseTime(b);

            let dayDiff = order.indexOf(A.day) - order.indexOf(B.day);
            if (dayDiff !== 0) return dayDiff;

            return A.start - B.start;
        });

        selectedListElement.innerHTML = sortedSchedule
            .map(slot => `<div class="selected-item">${slot}</div>`)
            .join('');
        timeslotsForm.style.display = 'block'; // Show form when slots are selected
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const availableSlots = document.querySelectorAll('.time-slot.available');

    availableSlots.forEach(slot => {
        slot.addEventListener('click', function () {
            const day = this.dataset.day;
            const time = this.dataset.time;
            const slotKey = `${day} ${time}`;

            if (this.classList.contains('selected')) {
                // Deselect
                this.classList.remove('selected');
                this.classList.add('available');
                selectedSlots.delete(slotKey);
            } else {
                // Select
                this.classList.remove('available');
                this.classList.add('selected');
                selectedSlots.add(slotKey);
            }

            updateSelectedDisplay();
        });
    });
});

/* Send data */
netIdInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendData();
    }
});
submitBtn.addEventListener('click', sendData);

function sendData() {
    submitBtn.innerText = 'Submitting...';
    submitBtn.disabled = true;

    let netId = netIdInput.value.trim();
    netId = DOMPurify.sanitize(netId);

    if (!netId || netId.trim() === '') {
        alert('Please enter your NetID');
        submitBtn.innerText = 'Submit timeslots';
        submitBtn.disabled = false;
        return;
    }

    if (selectedSlots.size === 0) {
        alert('Please select at least one time slot');
        submitBtn.innerText = 'Submit timeslots';
        submitBtn.disabled = false;
        return;
    }

    // Create timeslots summary
    const timeslotsSummary = new URLSearchParams({
        source: 'EduclaraMeFreeWhen',
        netId: netId,
        timeslots: sortedSchedule,
        timestamp: new Date()
    });

    const url = 'https://script.google.com/macros/s/AKfycbxLT5XclCM5DO8u7R5kqP3s9jwJbV-8nj_4DfGibzxmxCzd9K7S65cwHp8t7LK9xZjirg/exec';

    // Make GET request
    fetch(url + '?' + timeslotsSummary.toString())
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            if (data.status === 'error') {
                const errorMsg = data.message.replace('Error: ', '');
                console.log(data.message);
                throw new Error(errorMsg);
            } else {
                console.log('Success: ' + JSON.stringify(data));
                alert(`Timeslots submitted successfully!
                NetID: ${data.netId}
                Selected slots:
                    ${data.timeslots.split(',').join('\n                    ')}
                Submission time: ${data.timestamp}
                `);

                // Reset form
                selectedSlots.clear();
                netIdInput.value = '';
                document.querySelectorAll('.time-slot.selected').forEach(slot => {
                    slot.classList.remove('selected');
                    slot.classList.add('available');
                });
                updateSelectedDisplay();
            }
        }).catch((err) => {
            console.error(err);
            alert(`There was an error submitting your time slots (${err.message}). Please try again.`);
        }).finally(() => {
            submitBtn.innerText = 'Submit timeslots';
            submitBtn.disabled = false;
        });
}