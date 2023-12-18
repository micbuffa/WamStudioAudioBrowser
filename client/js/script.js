let audioData; // Variable globale pour stocker les données JSON
//const URL_SERVER = "http://localhost:3000";
//const URL_SERVER = "http://localhost:6002";
const URL_SERVER = "https://wam-bank.i3s.univ-cotedazur.fr"

let audioLoadCounter = 0;
let totalAudios = 0; // Total des audios à charger

function init() {
    fetch(URL_SERVER + "/api/audioloops")
        .then((response) => response.json())
        .then((data) => {
            audioData = data;
            const folderContainer = document.getElementById('folder-container');
            generateStructure(audioData, folderContainer);
            attachMetadataLoader();
            document.getElementById('reset-filters-btn').addEventListener('click', resetDisplay);
            // initFavouriteIcons(); // Initialisez les icônes de favoris
            // attachPlayPauseEventListeners();
            document.getElementById('show-favorites').addEventListener('change', function () {
                const favoritesContainer = document.getElementById('favorites-container');
                const folderContainer = document.getElementById('folder-container');
                const filesContainer = document.getElementById('files-container');

                if (this.checked) {
                    // Afficher les favoris et cacher les autres éléments
                    favoritesContainer.style.display = 'block';
                    folderContainer.style.display = 'none';
                    filesContainer.style.display = 'none';
                } else {
                    // Cacher les favoris et afficher les autres éléments
                    favoritesContainer.style.display = 'none';
                    folderContainer.style.display = 'block';
                    filesContainer.style.display = 'block';
                }
            });

            updateFavoritesDisplay(); // Affichez les favoris si nécessaire

        })

        .catch((error) => {
            console.error("Error fetching audio data:", error);
        });
}

window.onload = init;

function toggleFolder(folderElement) {
    const sublist = folderElement.querySelector('.nested');
    if (sublist) {
        sublist.classList.toggle('show');
    }
}

function generateStructure(data, container, currentPath = '') {
    data.children.forEach(element => {
        console.log("Element:", element)
        let item;
        let fullPath;
        // console.log(data.children);

        if (element.type === 'folder') {
            // S'assurer que le chemin courant se termine par un seul slash
            let folderPath = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
            fullPath = `${folderPath}${element.name}/`;
        } else {
            // Pour les fichiers, assurez-vous de ne pas ajouter de slash supplémentaire
            let filePath = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
            fullPath = `${filePath}${element.name}`;
        }

        // Console log pour vérifier le fullPath
        // console.log("Chemin complet généré:", fullPath);

        if (element.type === "file") {
            item = document.createElement("div");
            item.innerHTML = createAudioPlayer(element, fullPath);
        } else if (element.type === "folder") {
            item = document.createElement("div");
            item.classList.add('folder');
            item.style.display = 'block';
            item.innerHTML = `
              <div class='folder-title' onclick='toggleFolder(this.parentElement)'>
                  <span class='folder-icon'><i class="bi bi-folder"></i></span>
                  <span>${element.name}</span>
              </div>
          `;
            const subList = document.createElement("div");
            subList.classList.add('nested');
            generateStructure(element, subList, fullPath); // Appel récursif pour les sous-dossiers
            item.appendChild(subList);
        }
        container.appendChild(item);
    });
}

//fonction de recherche
function resetFoldersAndFilesDisplay() {
    // Effacer le contenu actuel
    const folderContainer = document.getElementById('folder-container');
    folderContainer.innerHTML = '';

    // Regénérer la structure des dossiers
    generateStructure(audioData, folderContainer);
}

function filterSongs() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const audioItems = document.getElementsByClassName('audio-file-item');
    let found = false; // Variable pour suivre si un élément correspondant a été trouvé

    if (searchTerm === '') {
        resetFoldersAndFilesDisplay();
    } else {
        Array.from(audioItems).forEach(item => {
            const title = item.getAttribute('data-filename').toLowerCase();
            const isVisible = title.includes(searchTerm);
            if (isVisible) {
                found = true; // Marquer qu'un élément correspondant a été trouvé
                item.style.display = 'block';
                openParentFolder(item);
            } else {
                item.style.display = 'none';
            }
        });

        if (!found) {
            // Si aucun élément correspondant n'a été trouvé, masquer tous les dossiers
            const folders = document.getElementsByClassName('folder');
            Array.from(folders).forEach(folder => folder.style.display = 'none');
        }
    }
}

function openParentFolder(item) {
    let parent = item.parentElement;
    while (parent) {
        if (parent.classList.contains('nested')) {
            parent.style.display = 'block'; // Ou toute autre classe/logique pour afficher le dossier
            // S'assurer que le parent du dossier est également ouvert
            openParentFolder(parent);
        }
        parent = parent.parentElement;
    }
}

function applyKeyAndBpmFilters() {
    const selectedKey = document.getElementById('key-select').value;
    const selectedMode = document.querySelector('input[name="key-mode"]:checked')?.value;
    const bpm = document.getElementById('bpm-input').value;

    const folderContainer = document.getElementById('folder-container');
    const filesContainer = document.getElementById('files-container');

    // Cachez les dossiers et les fichiers non filtrés
    folderContainer.style.display = 'none';

    // Nettoyer les résultats précédents et appliquer les filtres
    filesContainer.innerHTML = '';
    filesContainer.style.display = 'block';

    searchAndFilterFoldersKeyBpm(audioData.children, filesContainer, selectedKey, selectedMode, bpm);
    //attachPlayPauseEventListeners(); // Assurez-vous d'attacher à nouveau les écouteurs d'événements
}

function resetDisplay() {
    const folderContainer = document.getElementById('folder-container');
    const filesContainer = document.getElementById('files-container');

    // Réinitialiser les valeurs des filtres
    document.getElementById('key-select').value = '';
    document.getElementById('bpm-input').value = '';
    // Réafficher les dossiers
    folderContainer.style.display = 'block';

    // Réinitialiser l'affichage des fichiers
    filesContainer.innerHTML = '';

}



function filterFile(file, selectedKey, selectedMode, bpm) {
    const fileName = file.name;
    const fileBpmMatch = fileName.match(/\d+bpm/i);
    const fileBpm = fileBpmMatch ? parseInt(fileBpmMatch[0].replace('bpm', ''), 10) : null;
    const fileKeyMatch = fileName.match(/[A-G]#?(maj|min)/i);
    const fileKey = fileKeyMatch ? fileKeyMatch[0].toLowerCase() : null;

    const matchesKey = selectedKey ? fileKey && fileKey.startsWith(selectedKey.toLowerCase()) : true;
    const matchesMode = selectedMode ? fileKey && fileKey.endsWith(selectedMode.toLowerCase()) : true;
    const matchesBpm = bpm ? fileBpm === parseInt(bpm, 10) : true;

    return matchesKey && matchesMode && matchesBpm;
}

function searchAndFilterFoldersKeyBpm(folders, containerElement, selectedKey, selectedMode, bpm, currentPath = '') {
    folders.forEach(item => {
        let fullPath = currentPath;

        if (item.type === 'folder') {
            // Construire le chemin pour les sous-dossiers
            fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            searchAndFilterFoldersKeyBpm(item.children, containerElement, selectedKey, selectedMode, bpm, fullPath);
        } else if (item.type === 'file') {
            const fileMatches = filterFile(item, selectedKey, selectedMode, bpm);
            if (fileMatches) {
                // Construire le chemin pour les fichiers
                fullPath = currentPath ? `/${currentPath}/${item.name}` : item.name;
                console.log(fullPath);
                const fileItem = document.createElement('div');
                fileItem.innerHTML = createAudioPlayer(item, fullPath, false, true);
                containerElement.appendChild(fileItem);
            }
        }
    });
}


function toggleFavourite(fullPath, buttonElement) {
    // Décoder le chemin pour la comparaison et la manipulation
    let decodedPath = decodeURI(fullPath).replace(/%23/g, '#').replace(/%20/g, ' ');
    let favourites = JSON.parse(localStorage.getItem('favourites')) || [];
    const heartIcon = buttonElement.querySelector('i');

    // Assurez-vous que la liste des favoris utilise des chemins décodés pour la cohérence
    let isFavourite = favourites.some(fav => decodeURI(fav).replace(/%23/g, '#').replace(/%20/g, ' ') === decodedPath);

    if (isFavourite) {
        // Retirer des favoris en utilisant le chemin décodé
        favourites = favourites.filter(fav => decodeURI(fav).replace(/%23/g, '#').replace(/%20/g, ' ') !== decodedPath);
        heartIcon.classList.remove('bi-heart-fill');
        heartIcon.classList.add('bi-heart');
    } else {
        // Ajouter aux favoris en utilisant le chemin décodé
        favourites.push(decodedPath);
        heartIcon.classList.add('bi-heart-fill');
        heartIcon.classList.remove('bi-heart');
    }

    // Stocker les favoris en utilisant les chemins décodés
    localStorage.setItem('favourites', JSON.stringify(favourites));
    updateFavoritesDisplay(); // Mettre à jour l'affichage des favoris
}


function updateFavoritesDisplay() {
    const favoritesContainer = document.getElementById('favorites-container');
    const favorites = JSON.parse(localStorage.getItem('favourites')) || [];

    favoritesContainer.innerHTML = '';

    favorites.forEach(path => {
        const fileObject = findFileObjectByPath(path, audioData.children, currentPath = '');
        if (fileObject) {
            const audioPlayerHtml = createAudioPlayer(fileObject, path, true);
            favoritesContainer.innerHTML += audioPlayerHtml;
        }
    });

}




function findFileObjectByPath(path, children, currentPath = '') {
    for (const item of children) {
        // Construire le chemin complet pour les dossiers et les fichiers
        let itemPath = `${currentPath}/${item.name}`;

        if (item.type === 'file' && `${URL_SERVER}${itemPath}` === path) {
            // Si l'élément est un fichier et correspond au chemin, retournez-le
            return item;
        } else if (item.type === 'folder') {
            // Si l'élément est un dossier, recherchez récursivement à l'intérieur
            const result = findFileObjectByPath(path, item.children, itemPath);
            if (result) return result;
        }
    }
    // Retourner null si aucun élément correspondant n'a été trouvé
    return null;
}

function togglePlayPause(audioId) {
    const audio = document.getElementById(audioId);
    if (!audio) {
        console.error("Élément audio introuvable:", audioId);
        return;
    }

    // Trouver le bouton de lecture dans le même conteneur que l'élément audio
    const playBtn = audio.closest('.audio-file-item').querySelector('.play-btn');
    if (!playBtn) {
        console.error("Bouton de lecture introuvable pour l'audio:", audioId);
        return;
    }

    const isPlaying = !audio.paused;
    if (isPlaying) {
        audio.pause();
        playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    } else {
        audio.play().then(() => {
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        }).catch(error => {
            console.error('Erreur lors de la lecture de l\'audio:', error);
        });
    }
}


function setAudioPriorityAndPlay(audioId) {
    const audioElement = document.getElementById(audioId);
    if (audioElement) {
        // Définir la priorité de chargement à haute
        audioElement.parentElement.setAttribute('data-loading-priority', 'high');

        // Modifier tous les autres éléments audio en priorité basse
        document.querySelectorAll('.audio-file-item[data-loading-priority="high"]').forEach(item => {
            if (item.id !== audioElement.parentElement.id) {
                item.setAttribute('data-loading-priority', 'low');
            }
        });

        // Démarrer la lecture
        togglePlayPause(audioId);
    }
}



function createAudioPlayer(element, path, isFavorite = false, isFilter = false) {
    console.log("element:", element)
    const safeName = element.name.replace(/\W+/g, '-');
    const audioIdfav = isFavorite ? '-fav' : '';
    const audioIdfilter = isFilter ? '-filter' : '';
    const audioId = `audio-${safeName}${audioIdfav}${audioIdfilter}`;
    const durationId = `duration-${safeName}`;
    const fileExtension = element.name.split('.').pop();
    //path = path.replace(/#/g, '%23').replace(/ /g, '%20');

    //let fullPath = path.startsWith(URL_SERVER) ? path : `${URL_SERVER}${path}`;
    //fullPath = path.replace(/#/g, '%23').replace(/ /g, '%20');

    const fullPathOfAudioFile = URL_SERVER + element.url;

    let urlOfAudioFile = new URL(fullPathOfAudioFile);
    let urlOfAudioFileAsString = urlOfAudioFile.toString();
    urlOfAudioFileAsString = urlOfAudioFileAsString.replace(/#/g, '%23').replace(/ /g, '%20');

    console.log("urlOfAudioFileAsString:", urlOfAudioFileAsString)

    return `
      <div class="audio-file-item" id="audio-item-${safeName}" data-filename="${element.name}">
        
          <button class="play-btn" onclick="setAudioPriorityAndPlay('${audioId}')">
              <i class="bi bi-play-fill"></i>
          </button>
          <span class="file-name">${element.name}</span>
          <span class="audio-duration" id="${durationId}"></span>
          <audio id="${audioId}" preload="none">
              <source src="${urlOfAudioFileAsString}" type="audio/${fileExtension}">
          </audio>
          <button class="favourite-btn" data-fullpath="${urlOfAudioFileAsString}" onclick="toggleFavourite('${urlOfAudioFileAsString}', this)">
              <i class="bi bi-heart"></i>
          </button>
          <button class="download-btn" onclick="window.open('${urlOfAudioFileAsString}')">
              <i class="bi bi-plus-circle"></i>
          </button>
      </div>
  `;
}


function attachMetadataLoader() {
    document.querySelectorAll('audio').forEach(audio => {
        audio.addEventListener('loadedmetadata', function () {
            const durationId = `duration-${audio.id.replace('audio-', '')}`;
            const durationElement = document.getElementById(durationId);
            if (durationElement) {
                const duration = audio.duration;
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                durationElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
        });
    });
}