[//]: # (Copyright © 2024 Perpetuator LLC)

# Creating project

## NVM Install

For MacOS...

```shell
brew.sh
install brew
brew install nvm
```

## NPM

```shell
nvm install 20.13.1
nvm use 20.13.1
echo "20.13.1" > .nvmrc
```

### Setting up `.nvmrc` with `.zshrc`:
```shell
autoload -U add-zsh-hook
# ...
# nvm config
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
nvm_auto() {
    if [[ -f ".nvmrc" ]]; then
        nvm use
    fi
}
add-zsh-hook chpwd nvm_auto
```

## Yarn

```shell
npm install -g yarn
yarn install
```
