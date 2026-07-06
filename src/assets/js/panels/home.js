/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.instancesSelect()
        this.playerInfos()
        this.radioPlayer()
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
    }

    radioPlayer() {
        const streamURL = 'https://moriohradio.magictiss.com/listen/morioh_radio/moriohradio.mp3'
        const nowPlayingURL = 'https://moriohradio.magictiss.com/api/nowplaying/morioh_radio'

        let playBTN = document.querySelector('.radio-play')
        let artIMG = document.querySelector('.radio-art')
        let titleTXT = document.querySelector('.radio-title')
        let artistTXT = document.querySelector('.radio-artist')
        let volumeSlider = document.querySelector('.radio-volume')

        this.radioAudio = new Audio()
        this.radioAudio.volume = volumeSlider.value / 100

        playBTN.addEventListener('click', () => {
            if (this.radioAudio.paused) {
                // recharger le flux pour reprendre au direct
                this.radioAudio.src = streamURL
                this.radioAudio.play().catch(() => { })
                playBTN.textContent = '❚❚'
                playBTN.classList.add('radio-playing')
            } else {
                this.radioAudio.pause()
                this.radioAudio.removeAttribute('src')
                playBTN.textContent = '▶'
                playBTN.classList.remove('radio-playing')
            }
        })

        volumeSlider.addEventListener('input', () => this.radioAudio.volume = volumeSlider.value / 100)

        let updateNowPlaying = async () => {
            try {
                let res = await fetch(nowPlayingURL).then(res => res.json())
                let song = res?.now_playing?.song
                if (!song) return
                titleTXT.textContent = song.title || 'Titre inconnu'
                artistTXT.textContent = song.artist || 'Morioh Radio'
                if (song.art) artIMG.src = song.art
            } catch {
                artistTXT.textContent = 'Radio indisponible'
            }
        }
        updateNowPlaying()
        setInterval(updateNowPlaying, 15000)
    }

    getInstanceIcon(instanceName) {
        let icons = {
            'Itoria': 'assets/images/icon/itoria-instance.png',
            'Survie Cobblemon': 'assets/images/icon/cobblemon.png'
        }
        return icons[instanceName] || 'assets/images/icon/unknown.png'
    }

    updateInstanceBranding(instanceName) {
        let logo = document.querySelector('.home-logo')
        let title = document.querySelector('.home-title')
        if (logo) logo.src = instanceName ? this.getInstanceIcon(instanceName) : 'assets/images/icon/icon.png'
        if (title) title.textContent = instanceName || 'Itoria'
    }

    centerInstanceCarousel(animate = true) {
        let track = document.querySelector('.instances-List')
        let viewport = document.querySelector('.instances-tab')
        let items = [...track.querySelectorAll('.instance-elements')]
        let idx = items.findIndex(item => item.classList.contains('active-instance'))
        if (idx < 0) idx = 0
        // largeur d'un emplacement : 84px + 12px de marge
        let offset = viewport.clientWidth / 2 - (idx * 124 + 55)
        track.style.transition = animate ? 'transform .4s cubic-bezier(.2, .8, .3, 1)' : 'none'
        track.style.transform = `translateX(${offset}px)`
    }

    async playerInfos() {
        let configClient = await this.db.readData('configClient')
        let account = await this.db.readData('accounts', configClient?.account_selected)
        if (!account) return
        document.querySelector('.player-name').textContent = account.name
        let accountType = account.meta?.type === 'Xbox' ? 'Compte Microsoft' : account.meta?.online === false ? 'Compte local' : 'Compte Minecraft'
        document.querySelector('.player-account-type').textContent = accountType
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews(this.config).then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                const date = this.getdate(new Date())
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon/icon.png">
                        <div class="header-text">
                            <div class="title">Aucun news n'ai actuellement disponible.</div>
                        </div>
                        <div class="date">
                            <div class="day">${date.day}</div>
                            <div class="month">${date.month}</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Vous pourrez suivre ici toutes les news relative au serveur.</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author">Auteur - <span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            const date = this.getdate(new Date())
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">${date.day}</div>
                            <div class="month">${date.month}</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Impossible de contacter le serveur des news.</br>Merci de vérifier votre configuration.</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }

    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient.account_selected)
        let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_select) ? configClient?.instance_select : null

        let instanceBTN = document.querySelector('.play-instance')
        let instancePopup = document.querySelector('.instance-popup')
        let instancesListPopup = document.querySelector('.instances-List')

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_select = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
                if (whitelist !== auth?.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        let configClient = await this.db.readData('configClient')
                        configClient.instance_select = newInstanceSelect.name
                        instanceSelect = newInstanceSelect.name
                        setStatus(newInstanceSelect.status)
                        await this.db.updateData('configClient', configClient)
                    }
                }
            } else console.log(`Initializing instance ${instance.name}...`)
            if (instance.name == instanceSelect) setStatus(instance.status)
        }
        this.updateInstanceBranding(instanceSelect)

        // construire le carrousel, qui sert aussi de logo principal
        instancesListPopup.innerHTML = ''
        for (let instance of instancesList) {
            if (instance.whitelistActive && !instance.whitelist.find(whitelist => whitelist == auth?.name)) continue
            let active = instance.name == instanceSelect ? ' active-instance' : ''
            instancesListPopup.innerHTML += `
                <div id="${instance.name}" title="${instance.name}" class="instance-elements${active}">
                    <img class="instance-icon" src="${this.getInstanceIcon(instance.name)}">
                </div>`
        }
        this.centerInstanceCarousel(false)

        instancePopup.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')

            if (e.target.classList.contains('instance-elements')) {
                let newInstanceSelect = e.target.id
                if (newInstanceSelect == configClient.instance_select) return
                let activeInstanceSelect = document.querySelector('.active-instance')

                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                e.target.classList.add('active-instance');
                this.centerInstanceCarousel()

                configClient.instance_select = newInstanceSelect
                await this.db.updateData('configClient', configClient)
                instanceSelect = instancesList.filter(i => i.name == newInstanceSelect)
                let instance = await config.getInstanceList()
                let options = instance.find(i => i.name == configClient.instance_select)
                await setStatus(options.status)
                this.updateInstanceBranding(configClient.instance_select)
            }
        })

        instanceBTN.addEventListener('click', () => this.startGame())
    }

    async startGame() {
        let launch = new Launch()
        let configClient = await this.db.readData('configClient')
        let instance = await config.getInstanceList()
        let authenticator = await this.db.readData('accounts', configClient.account_selected)
        let options = instance.find(i => i.name == configClient.instance_select)

        let playInstanceBTN = document.querySelector('.play-instance')
        let infoStartingBOX = document.querySelector('.info-starting-game')
        let infoStarting = document.querySelector(".info-starting-game-text")
        let progressBar = document.querySelector('.progress-bar')

        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 10000,
            path: `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
            instance: options.name,
            version: options.loader.minecraft_version,
            detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,

            loader: {
                type: options.loader.loader_type,
                build: options.loader.loader_version,
                enable: options.loader.loader_type == 'none' ? false : true
            },

            verify: options.verify,

            ignored: [...options.ignored],

            java: {
                path: configClient.java_config.java_path,
            },

            JVM_ARGS:  options.jvm_args ? options.jvm_args : [],
            GAME_ARGS: options.game_args ? options.game_args : [],

            screen: {
                width: configClient.game_config.screen_size.width,
                height: configClient.game_config.screen_size.height
            },

            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        }

        launch.Launch(opt);

        playInstanceBTN.style.display = "none"
        document.querySelector('.instance-popup').style.pointerEvents = "none"
        infoStartingBOX.style.display = "block"
        progressBar.style.display = "";
        ipcRenderer.send('main-window-progress-load')

        launch.on('extract', extract => {
            ipcRenderer.send('main-window-progress-load')
            console.log(extract);
        });

        launch.on('progress', (progress, size) => {
            infoStarting.innerHTML = `Téléchargement ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('check', (progress, size) => {
            infoStarting.innerHTML = `Vérification ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('estimated', (time) => {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = Math.floor(time - hours * 3600 - minutes * 60);
            console.log(`${hours}h ${minutes}m ${seconds}s`);
        })

        launch.on('speed', (speed) => {
            console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
        })

        launch.on('patch', patch => {
            console.log(patch);
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Patch en cours...`
        });

        launch.on('data', (e) => {
            progressBar.style.display = "none"
            let radioPlaying = this.radioAudio && !this.radioAudio.paused
            if (configClient.launcher_config.closeLauncher == 'close-launcher' && !radioPlaying) {
                ipcRenderer.send("main-window-hide")
            };
            new logger('Minecraft', '#36b030');
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Demarrage en cours...`
            console.log(e);
        })

        launch.on('close', code => {
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            document.querySelector('.instance-popup').style.pointerEvents = ""
            infoStarting.innerHTML = `Vérification`
            new logger(pkg.name, '#7289da');
            console.log('Close');
        });

        launch.on('error', err => {
            let popupError = new popup()

            popupError.openPopup({
                title: 'Erreur',
                content: err.error,
                color: 'red',
                options: true
            })

            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            document.querySelector('.instance-popup').style.pointerEvents = ""
            infoStarting.innerHTML = `Vérification`
            new logger(pkg.name, '#7289da');
            console.log(err);
        });
    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}
export default Home;