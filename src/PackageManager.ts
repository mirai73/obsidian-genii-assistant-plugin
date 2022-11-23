import {TextGeneratorConfiguration,PackageTemplate,PromptTemplate} from "./types";
import { App,normalizePath,request,MarkdownRenderer } from "obsidian";
import {gt} from "semver";

export default class PackageManager {
    configuration: TextGeneratorConfiguration;
    app: App;
    promptsPath: string;
	constructor(app:App,promptsPath:string) {
        this.app = app;
        this.promptsPath=promptsPath;
    }

    async load() {
        const adapter = this.app.vault.adapter;
        const configPath = this.getConfigPath();
        if (await adapter.exists(configPath)){
            this.configuration=JSON.parse(await adapter.read(configPath));
         } else {
            await this.initConfigFlie();
             await this.updatePackagesList();
        }
    }
     
    async initConfigFlie()
    {
        const initConfig = {
            packages: [],
            installedPackages:[]
            }
            const adapter=this.app.vault.adapter;
            adapter.write(this.getConfigPath(),JSON.stringify(initConfig));
            this.configuration=JSON.parse(await adapter.read(this.getConfigPath()));
    }

    getConfigPath(){
       return normalizePath(this.app.vault.configDir + "/text-generator.json");
    }

    async save() {
        const adapter = this.app.vault.adapter;
        const configPath = this.getConfigPath();
        adapter.write(
            configPath,
            JSON.stringify(this.configuration),
        ) 
        
    }

    async checkUpdates(){
        await this.updatePackagesList();
        await this.updatePackagesInfo();
        let packagesIdsToUpdate:string[]=[];
        this.configuration.installedPackages.forEach((installedPackage)=>{
            if (gt(this.getPackageById(installedPackage.packageId).version,installedPackage.version ) ) {
            packagesIdsToUpdate.push(installedPackage.packageId);
           } 
        })
        return packagesIdsToUpdate;
    }

    async updatePackagesList() {
        const remotePackagesListUrl=`https://raw.githubusercontent.com/text-gen/text-generator-packages/master/community-packages.json`;
        let remotePackagesList:PackageTemplate[] = JSON.parse(await request({url: remotePackagesListUrl}));
        const newPackages=remotePackagesList.filter(p=>this.getPackageById(p.packageId)===undefined);
        newPackages.forEach(p=>this.configuration.packages.push(p));
        await this.updatePackagesStats();
        this.save();
    }

    async updatePackagesStats(){
        const stats:any=await this.getStats(); 
        this.configuration.packages= this.configuration.packages.map(p=>({...p,downloads:stats[p.packageId]?stats[p.packageId].downloads:0}))
    }

    async getStats(){
        const remotePackagesListUrl=`https://raw.githubusercontent.com/text-gen/text-generator-packages/master/community-packages-stats.json`;
        const stats:any[] = JSON.parse(await request({url: remotePackagesListUrl}));
        return stats;
    }

    getPackagesList() {
        const list=  this.configuration.packages.map(p=>({...p,installed:this.configuration.installedPackages.findIndex(pi=>pi.packageId===p.packageId)!==-1}))
         return list;
    }


    async updatePackagesInfo() {
        await Promise.all(this.configuration.packages.map(p=>this.updatePackageInfoById(p.packageId))) 
    }

    async updatePackageInfoById(packageId:string) {
        const p=this.getPackageById(packageId);
        const repo=p.repo;
        const release = await this.getReleaseByRepo(repo);
        const manifest= await this.getAsset(release,'manifest.json'); 
        this.setPackageInfo(packageId,{...manifest,published_at:release.published_at,downloads:release.downloads});
        await this.save();
    }

    setPackageInfo(packageId:string,info:PackageTemplate) {
        const packageIndex=this.configuration.packages.findIndex(p=>p.packageId===packageId);
        this.configuration.packages[packageIndex]=info;
    }

    async addPackage(repo:string){
        // download assets: manifest file, prompts.json
        // add manifest to this.configuration.packages {packageId,prompts,installedPrompts=empty}
        const release = await this.getReleaseByRepo(repo);
        const manifest= await this.getAsset(release,'manifest.json'); 
        this.configuration.packages.push(manifest);
        await this.save();
    }

    async installPackage(packageId:string, installAllPrompts:boolean=true){
        const p=await this.getPackageById(packageId);
        const repo = p.repo;
        const release = await this.getReleaseByRepo(repo);
        const data= await this.getAsset(release,'data.json'); 
        // this.configuration.installedPackages {packageId,prompts,installedPrompts=empty}
        const installedPrompts:string []=[];
        this.configuration.installedPackages.push({packageId,prompts: data.prompts.map(promptId=>({promptId})),installedPrompts,version:p.version});

        if(installAllPrompts) {
            await Promise.all(data.prompts.map(promptId=>this.installPrompt(packageId,promptId,true)));
            console.log("all prompts installed");
        }
        
        await this.save();
    }

    getPackageById(packageId:string):PackageTemplate{
        return this.configuration.packages.find(p=>p.packageId===packageId);
    }

    getPromptById(packageId:string,promptId:string) {
        return this.configuration.installedPackages.find(p=>p.packageId === packageId).prompts.find(prompt=>prompt.promptId===promptId);
    }


    async getReleaseByPackageId(packageId:string) {
        const p=await this.getPackageById(packageId);
       if(p) 
        {
            return await this.getReleaseByRepo(p.repo);
        } else 
        {
            console.error("Package ID not found.")
        }
        }

    async getReleaseByRepo(repo:string) {
		const rawReleases = JSON.parse(await request({
			url: `https://api.github.com/repos/${repo}/releases`,
		}));

		const rawRelease: any = rawReleases.filter((x: any) => !x.draft && !x.prerelease).sort((x: any) => x.published_at)[0]
        const downloads: number= rawReleases.reduce((p,c) => c.assets[0].download_count+p,0);
		const release = {
			version: rawRelease.tag_name,
            published_at:rawRelease.published_at,
			assets: rawRelease.assets.map((asset: any) => ({
				name: asset.name,
				url: asset.browser_download_url,
			})),
            downloads	
		}
		
		return release;
	}
    /** https://github.com/plugins-galore/obsidian-plugins-galore/blob/bd3553908fa9eacf33a5e1c2e7b0dea2a02a9d80/src/util/gitServerInterface.ts#L86 */
	async getAsset (release: any, name: string) {
		const asset = release.assets.filter(asset => asset.name === name)[0];
		if (!asset) {
			return null;
		}
		return JSON.parse(await request({
			url: asset.url,
		}));
	}

    async getReadme(packageId:string) {
        const repo = await this.getPackageById(packageId).repo;
			const url=`https://raw.githubusercontent.com/${repo}/main/README.md`;
			try {
              const readmeMD= await request({url:url});
              let el=document.createElement("div");
              MarkdownRenderer.renderMarkdown(readmeMD,el);
                
              return el; 
                
            } catch (error) {
                console.error(error);
                Promise.reject(error);
            }
    }
    
    async installPrompt(packageId:string,promptId:string,overwrite:boolean=true) {
        const repo = await this.getPackageById(packageId).repo;
			const url=`https://raw.githubusercontent.com/${repo}/master/prompts/${promptId}.md`;
			try {
                await this.writePrompt(packageId,promptId,await request({url:url}),overwrite);
                this.configuration.installedPackages.find(p=>p.packageId===packageId).installedPrompts.push({promptId:promptId,version:""});//this.getPromptById(packageId,promptId).version
            } catch (error) {
                console.error(error);
                Promise.reject(error);
            }
    }

    getPromptPath(packageId:string,promptId:string) {
		const promptsPath= this.promptsPath;
		//app.vault.configDir
		const templatePath=normalizePath(`${promptsPath}/${packageId}/${promptId}.md`);
		return templatePath;
	}

    async writePrompt(packageId:string,promptId:string,content:any,overwrite:boolean) {
		const path = this.getPromptPath(packageId,promptId);
		const adapter = this.app.vault.adapter;
		try {
            const packageDir=normalizePath(this.promptsPath+'/'+packageId);
			if (!(await adapter.exists(packageDir))) {
				await adapter.mkdir(packageDir);
			}
			let write = true;
			if(!overwrite&&await adapter.exists(path)) {
				let text = "Template "+path+" exists!\nEither OK to Overread or over Cancel.";
					if (await confirm(text) == false) {
						write = false;
					} 
			} 

			if(write){
				adapter.write(
					path,
					content,
				)
			}			
		} catch (error) {
			console.error(error);
			Promise.reject(error);
		}
	}

    async uninstallPackage(packageId:string) {
       const index = this.configuration.installedPackages.findIndex(p=>p.packageId===packageId);
        index !==-1 && this.configuration.installedPackages.splice(index, 1);
    }
}