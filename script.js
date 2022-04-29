'use strict';

// prettier-ignore


class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in minutes
        
    }

    _setDescription() {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = "cycling";

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}


// console.log(run1, cycling1);

//////////////////////////////////////////////////////////////////
// application architecture

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let btnEdit, btnDelete;


class App {
    #map;
    #mapEvent;
    #workouts = [];
    

    constructor() {
        this._getPosition(); 
        // this._getPosition() vola metodu _getPosition, ktora zavola getCurrentPosition, ktora (ak sa úspešne načítaju suradnice uživatela) zavola _loadMap
        // _loadMap dostane ako argument objekt obsahujuci okrem ineho suradnice uživatela podla ktorych vykresli mapu jeho približnej polohy
        // _loadMap taktiež obsahuje event handler ktory sa stará o clicky na mapu, ktory vracia objekt s informaciami o evente - suradnice clicku atd
        // tento event handler obsahuje callback _showForm, ktoreho argumentom je prave spominany objekt, tento objekt s datami o suradniciach clicku sa uklada do #mapEvent
        // metoda _newWorkout potom využíva tieto data z #mapEvent, aby na príslušnom mieste vykreslila marker
        // _toggleElevationField prepína cadence/elev gain podla zmeny formu

        this._getLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this)) ;
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

        // console.log(this.#workouts);
        // console.log(this.#workouts.indexOf(this.#workouts.find(e => e.id === "1217363828")));
    }

    _getPosition() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            
        function() {
            alert("Could not get your position")
        });        
        };
    }

    _loadMap(position) {
        // console.log(position);
        const {latitude} = position.coords;
        const {longitude} = position.coords;
    
        const coords = [latitude, longitude];
        // console.log(`https://www.google.cz/maps/@${latitude},${longitude}`);
        this.#map = L.map('map').setView(coords, 13);
        // console.log(map);
    
         L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        
        // handling clicks on map
        this.#map.on("click", this._showForm.bind(this));
        
        // markery musime načítat z pamate až tu, pretože prvi prvom spustení chvílu trvá, kým sa mapa načíta
        // takže v tej dobe ešte nie je možné načítat marker na mape
        // preto ho načítavame až po naloadovaní mapy
        this.#workouts.forEach(e => {
            this._renderWorkoutMarker(e);
            
        });
    }

    _showForm(mapE) {
        // console.log(mapE)
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm() {
        // empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(() => (form.style.display = "grid"), 1000)
    }

    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(e => Number.isFinite(e));
        const allPositive = (...inputs) => inputs.every(e => e > 0);

        e.preventDefault();

        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;
        
        // check if data is valid

        // if activity running, create running object, if activity cycling, create cycling object
        if(type === "running") {
            const cadence = +inputCadence.value;
            if(
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
                ) 
                return alert("Inputs have to be positive numbers!")

            workout = new Running([lat, lng], distance, duration, cadence);
            
        }

        if(type === "cycling") {
            const elevation = +inputElevation.value;

            if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return alert("Inputs have to be positive numbers!")

                workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // add new object to the workout array
        this.#workouts.push(workout);
        // console.log(workout);

        // render workout on map as marker
        this._renderWorkoutMarker(workout)

        // render workout on list
        this._renderWorkout(workout);
        
        // clear inpuit fields + hide form
        this._hideForm();

        // set local storage to all workouts
        this._setLocalStorage();


    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,

    }))
    .setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
    .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;
        if(workout.type === "running")
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
          </div>
                <button class="workout__btn btn_edit">Edit</button>
                <button class="workout__btn btn_delete">Delete</button>
        </li>
            `
        if(workout.type === "cycling")
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
          </div>
                <button class="workout__btn btn_edit">Edit</button>
                <button class="workout__btn btn_delete">Delete</button>
        </li>
            `;

        form.insertAdjacentHTML("afterend", html);

        btnEdit = document.querySelector(".btn_edit"); 
        btnDelete = document.querySelector(".btn_delete");

        btnEdit.addEventListener("click", this._editWorkout.bind(this));
        btnDelete.addEventListener("click", this._deleteWorkout.bind(this));

    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest(".workout");
        // console.log(e.target);

        if(!workoutEl) return;

        const workout = this.#workouts.find(e => e.id === workoutEl.dataset.id);
        

        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: {
                duration: 1,
            }
        });

    }
    
    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        
        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(e => {
            this._renderWorkout(e);
            
        });
    }

    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    } 

    _editWorkout(e) {
        const workoutEl = e.target.closest(".workout");
        const workoutId = workoutEl.getAttribute("data-id");
        console.log(this.#workouts.find(e => e.id === workoutId));
        // const btnEdEl = e.target.closest(".btn_edit");
        // console.log(btnEdEl);
        console.log("trying to edit workout..");
    }

    _deleteWorkout(e) {
        const workoutEl = e.target.closest(".workout");
        const workoutId = workoutEl.getAttribute("data-id");
        this.reset();
        this.#workouts.splice(this.#workouts.indexOf(this.#workouts.find(e => e.id === `${workoutId}`)), 1);
        this._setLocalStorage();

        // console.log(this.#workouts.find(e => e.id === workoutId));
        // const btnDelEl = document.querySelector(".workout__title").parentElement.lastElementChild;
        // if(!btnDelEl) return;

        

    }
};


const app = new App();























