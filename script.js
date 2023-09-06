let countriesMap = new Map();
let minAQI;
let maxAQI;

let countriesLayer
let UniqueValueRenderer
let SimpleFillSymbol

async function fetchDataForCountry(value) {
    let capitalForAQICN = value['capital'].replace(/\s+/g, '-').replace(/['",.]+/g, '').toLowerCase();
    let latlng = value['latlng'];
    let lat = latlng[0];
    let lng = latlng[1];
    // console.log(latlng)
    let responseFromAQICN = await fetch(`https://api.waqi.info/feed/geo:${lat};${lng}/?token=a07e48842db5af94ad654a4fc6f3647acccdaf91`);
    let dataFromAQICN = await responseFromAQICN.json();
    let aqicnIndex = dataFromAQICN.data.aqi;
    value['aqi'] = aqicnIndex;
}
//TODO: fetchDataForCountryEveryMinute

async function fetchCountriesMapData() {
    try {
        let response = await fetch('countries.json');
        let data = await response.json();

        for (let item of data) {
            // console.log(JSON.stringify(item.cca3));
            countriesMap.set(item.cca3, { 'countryName': item.name.common, 'capital': item.capital[0], 'latlng': item.latlng, });  // Note: Assuming 'capital' is also an array and you want the first capital
        }

        let promises = [];

        for (let [key, value] of countriesMap.entries()) {
            promises.push(fetchDataForCountry(value));

        }

        await Promise.all(promises);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        console.log(countriesMap);
        // Convert the map to an array of [key, value] pairs
        let countriesArray = Array.from(countriesMap.entries());

        // Sort the array by AQI in descending order
        countriesArray.sort((a, b) => b[1].aqi - a[1].aqi);

        // Get the top 3 countries
        let top3Countries = countriesArray.slice(0, 5);

        // Print out the top 3 countries with their details
        top3Countries.forEach((country) => {
            addCountryToList(country[1].countryName, country[1].aqi)
            console.log(`Country Name: ${country[1].countryName}`);
            console.log(`Capital: ${country[1].capital}`);
            console.log(`AQI: ${country[1].aqi}`);
            console.log('------');
        });
        minAQI = countriesArray[countriesArray.length - 1][1].aqi
        maxAQI = countriesArray[0][1].aqi
        const loader = document.querySelector("calcite-loader")
        loader.style.display = 'none'
        const scrim = document.querySelector("calcite-scrim")
        scrim.style.display = 'none'
        const body = document.getElementById("bottom-bar")
        body.style.display = 'block'

        const slider = document.querySelector("calcite-slider")
        slider["min"] = minAQI
        slider["max"] = maxAQI
        slider["ticks"] = maxAQI
        slider["steps"] = [50, 100, 150, 200, 300]
        slider["value"] = minAQI

        slider.addEventListener('calciteSliderChange', function (event) { onMovingSlider(slider) })

        const sliderValueElement = document.getElementById('sliderValue');
        sliderValueElement.textContent = slider["value"];
    }

}

function onMovingSlider(slider) {
    const sliderValueElement = document.getElementById('sliderValue');
    sliderValueElement.textContent = slider["value"];
    countriesLayer.renderer = null;

    updateCountriesRenderer(slider["value"]);

}

function updateCountriesRenderer(thresholdAQI) {
    let renderer = new UniqueValueRenderer({
        field: "ISO_A3",
        defaultSymbol: new SimpleFillSymbol({ // Default symbol if not matched
            color: "rgba(0, 0, 0, 0.8)",
            outline: {
                color: [255, 255, 255, 0.5],
                width: 0.75
            }
        })
    });

    // For each country in your map, add a unique value info with the color for that country's AQI if it's above the threshold
    for (let [countryCode, countryData] of countriesMap.entries()) {
        let aqi = countryData['aqi'];
        if (aqi >= thresholdAQI) {  // Only add colors for AQIs above the threshold
            let color = getColor(aqi);
            renderer.addUniqueValueInfo({
                value: countryCode,
                symbol: new SimpleFillSymbol({
                    color: color,
                    outline: {
                        color: [255, 255, 255, 0.5],
                        width: 0.75
                    }
                })
            });
        }
    }

    countriesLayer.renderer = renderer;
    countriesLayer.refresh();
}
document.getElementById("surprise-me").addEventListener("click", function () {
    const slider = document.querySelector("calcite-slider")
    slider["value"] = getRandomInt(minAQI, maxAQI)
    onMovingSlider(slider)
});

document.getElementById("chart-button").addEventListener("click", function () {
    const pollutionList = document.getElementById("highest-pollution-list");
    // Toggle the display style
    if (pollutionList.style.display === "none" || pollutionList.style.display === "") {
        pollutionList.style.display = "block";
    } else {
        pollutionList.style.display = "none";
    }
});
function getColor(aqi) {
    var colors = adjustedColors = [
        "rgba(50, 212, 50, 0.8)",      // Less fluorescent green
        "rgba(204, 208, 13, 0.8)",    // Less fluorescent yellow
        "rgba(255, 140, 85, 0.8)",    // Less fluorescent orange
        "rgba(255, 85, 85, 0.8)",     // Less fluorescent red
        "rgba(255, 95, 95, 0.8)",     // Less fluorescent reddish-orange
        "rgba(140, 20, 50, 0.8)",     // Less fluorescent deep red
        "rgba(0, 0, 0, 0.8)"    // Less fluorescent grey
    ];;
    if (aqi <= 50) return colors[0];
    if (aqi <= 100) return colors[1];
    if (aqi <= 150) return colors[2];
    if (aqi <= 200) return colors[3];
    if (aqi <= 300) return colors[4];
    if (aqi == undefined) return colors[6];
    return colors[5];
}

const toggleThemeButton = document.querySelector("#toggleThemeBtn");

toggleThemeButton.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const themeStylesheet = document.getElementById('themeStylesheet');

    if (currentTheme === 'dark') {
        document.documentElement.setAttribute("data-theme", "light");
        themeStylesheet.href = "https://js.arcgis.com/4.27/esri/themes/light/main.css";
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        themeStylesheet.href = "https://js.arcgis.com/4.27/esri/themes/dark/main.css";
    }
});

function addCountryToList(countryName, aqi) {
    // Create a new <calcite-list-item> element
    const newItem = document.createElement('calcite-list-item');

    // Set attributes for the new item
    newItem.setAttribute('label', countryName);

    let severity = getSeverityFromAqi(aqi, ''); // Assuming you have this function from your previous code
    newItem.setAttribute('description', `Air pollution Index: ${aqi} (${severity})`);

    // Assuming you have a unique value for each country, else adjust accordingly
    newItem.setAttribute('value', countryName.toLowerCase().replace(/ /g, '-'));
    newItem.style.setProperty('--calcite-ui-text-3', getColor(aqi));

    // Get the <calcite-list> element
    const list = document.querySelector('#highest-pollution-list > calcite-list');

    // Append the new item to the list
    list.appendChild(newItem);
}

require(["esri/config",
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Search",
    "esri/widgets/Slider",
    "esri/rest/locator",
    "esri/layers/FeatureLayer",
    "esri/renderers/SimpleRenderer",
    "esri/symbols/SimpleFillSymbol",
    "esri/rest/support/Query",
    "esri/renderers/UniqueValueRenderer"
], function (esriConfig, Map, MapView, Search, Slider, locator, FeatureLayer, SimpleRenderer, SimpleFillSymbol1, Query, UniqueValueRenderer1) {
    UniqueValueRenderer = UniqueValueRenderer1
    SimpleFillSymbol = SimpleFillSymbol1
    // fetchCountriesMapData();
    esriConfig.apiKey = "AAPK2c13db0ea80c4565b7a30d62b79e0336qxRf9K8CQYgms5s3o36kP8odhNBhJbvrdmQ3HpTY9SgpW9nhlDpSUnWccFP2kZFC";
    const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

    const map = new Map({
        basemap: "arcgis-navigation"
    });

    const view = new MapView({
        map: map,
        center: [-0.09, 51.499],
        zoom: 2,
        container: "viewDiv"
    });
    countriesLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/xX0nnxYki76xgN4F/arcgis/rest/services/countries/FeatureServer/0"
    });

    map.add(countriesLayer);



    countriesLayer.when(async function () {

        await fetchCountriesMapData(countriesLayer, UniqueValueRenderer, SimpleFillSymbol);

        let renderer = new UniqueValueRenderer({
            field: "ISO_A3",
            defaultSymbol: new SimpleFillSymbol({ // Default symbol if not matched
                color: "rgba(0, 0, 0, 0.8)",
                outline: {
                    color: [255, 255, 255, 0.5],
                    width: 0.75
                }
            })
        });

        // For each country in your map, add a unique value info with the color for that country's AQI
        for (let [countryCode, countryData] of countriesMap.entries()) {
            let aqi = countryData['aqi'];
            let color = getColor(aqi);

            renderer.addUniqueValueInfo({
                value: countryCode,
                symbol: new SimpleFillSymbol({
                    color: color,
                    outline: {
                        color: [255, 255, 255, 0.5],
                        width: 0.75
                    }
                })
            });
        }

        countriesLayer.renderer = renderer;
    });


    const search = new Search({
        view: view,
        container: "searchWidget",
    });



    /*******************************************************************
     * This click event sets generic content on the popup not tied to
     * a layer, graphic, or popupTemplate. The location of the point is
     * used as input to a reverse geocode method and the resulting
     * address is printed to the popup content.
     *******************************************************************/
    view.popupEnabled = false;

    view.on("click", (event) => {
        // Get the coordinates of the click on the view
        const lat = Math.round(event.mapPoint.latitude * 1000) / 1000;
        const lon = Math.round(event.mapPoint.longitude * 1000) / 1000;



        const params = {
            location: event.mapPoint
        };

        // Display the popup
        // Execute a reverse geocode using the clicked location
        locator
            .locationToAddress(locatorUrl, params)
            .then((response) => {
                countryCode = response.attributes.CountryCode;
                let countryName = '';
                let capital = '';
                let aqi = '';
                // console.log(countryCode)
                //https://github.com/mledoze/countries/blob/master/countries.json

                countryName = countriesMap.get(countryCode)['countryName'];
                console.log(countryName)
                capital = countriesMap.get(countryCode)['capital'];
                console.log(`Country: ${countryName}, Capital: ${capital}`);
                aqi = Number(countriesMap.get(countryCode)['aqi']);

                let severity = '';
                // console.log(aqi);

                severity = getSeverityFromAqi(aqi, severity);

                // //todo calcite popover use
                // const popover = document.getElementById("popover")
                // popover.open = true
                // console.log(popover.open)

                // popover.addEventListener('calciteSliderChange', function (event) { })

                view.openPopup({
                    // Set the popup's title to the coordinates of the location
                    title: `${countryName} - ${capital}`,
                    location: event.mapPoint, // Set the location of the popup to the clicked location
                    content: `Pollution data ${aqi || ''} - ${severity}`,
                });

            })
            .catch(() => {
                // If the promise fails and no result is found, show a generic message
                view.popup.content = "No address was found for this location";
                view.popup.title = `Cannot locate country`
                view.popup.location = event.mapPoint// Set the location of the popup to the clicked location

            });
    });
    view.ui.move('zoom', "top-left");
    view.ui.margin = { top: 20, left: 0, right: 0, bottom: 0 };

});

function getSeverityFromAqi(aqi, severity) {
    if (aqi <= 50) {
        severity = 'Good';
    } else if (aqi <= 100) {
        severity = 'Moderate';
    } else if (aqi <= 150) {
        severity = 'Unhealthy for Sensitive Groups';
    } else if (aqi <= 200) {
        severity = 'Unhealthy';
    } else if (aqi <= 300) {
        severity = 'Very Unhealthy';
    } else if (aqi > 300) {
        severity = 'Hazardous';
    } else {
        severity = 'Not available';
    }
    return severity;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}
// setInterval(fetchDataForCountry, 60000); // 60000 milliseconds = 1 minute
