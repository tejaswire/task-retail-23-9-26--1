pipeline {

    agent any

    parameters {
        choice(
            name: 'DEPLOYMENT_ACTION',
            choices: ['DEPLOY', 'ROLLBACK'],
            description: 'Deployment action'
        )

        choice(
            name: 'ENVIRONMENT',
            choices: ['UAT', 'PRODUCTION'],
            description: 'Deployment environment'
        )

        string(
            name: 'VERSION',
            defaultValue: '4.2.0',
            description: 'Application version/tag'
        )

        choice(
            name: 'CONFIRM_PROD',
            choices: ['NO', 'YES'],
            description: 'Required YES for production deployment'
        )
    }

    environment {
        IMAGE_NAME = 'retail-app'
        CONTAINER_NAME = 'retail-app'
        NETWORK_NAME = 'retail-network'
        APP_PORT = '8081'
        DOCKER = 'C:/Users/DELL/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'
    }

    stages {

        stage('Validate Parameters') {
            steps {
                script {

                    echo "======================================"
                    echo "DEPLOYMENT ACTION : ${params.DEPLOYMENT_ACTION}"
                    echo "ENVIRONMENT       : ${params.ENVIRONMENT}"
                    echo "VERSION            : ${params.VERSION}"
                    echo "CONFIRM PROD      : ${params.CONFIRM_PROD}"
                    echo "======================================"

                    if (params.ENVIRONMENT == 'PRODUCTION' &&
                        params.DEPLOYMENT_ACTION == 'DEPLOY' &&
                        params.CONFIRM_PROD != 'YES') {

                        error("Production deployment blocked. CONFIRM_PROD must be YES.")
                    }

                    if (params.VERSION.trim() == '') {
                        error("VERSION cannot be empty.")
                    }
                }
            }
        }

        stage('Validate Git Version') {
            steps {
                script {

                    bat """
                        git fetch --tags
                    """

                    def tagStatus = bat(
                        script: "git rev-parse refs/tags/v${params.VERSION}",
                        returnStatus: true
                    )

                    if (tagStatus != 0) {
                        error("Git tag v${params.VERSION} does not exist.")
                    }

                    def commitId = bat(
                        script: "git rev-list -n 1 refs/tags/v${params.VERSION}",
                        returnStdout: true
                    ).trim()

                    echo "Git tag       : v${params.VERSION}"
                    echo "Git commit    : ${commitId}"
                }
            }
        }

        stage('Build Docker Image') {
            when {
                expression {
                    params.DEPLOYMENT_ACTION == 'DEPLOY'
                }
            }

            steps {
                bat """
                    "${DOCKER}" build -t ${IMAGE_NAME}:${params.VERSION} .
                """

                echo "Docker image created: ${IMAGE_NAME}:${params.VERSION}"
            }
        }

        stage('Record Previous Production') {
            when {
                expression {
                    params.DEPLOYMENT_ACTION == 'DEPLOY'
                }
            }

            steps {
                script {

                    def previousImage = bat(
                        script: """
                            docker inspect ${CONTAINER_NAME} --format="{{.Config.Image}}"
                        """,
                        returnStatus: true
                    )

                    if (previousImage == 0) {
                        env.PREVIOUS_IMAGE = bat(
                            script: """
                                docker inspect ${CONTAINER_NAME} --format="{{.Config.Image}}"
                            """,
                            returnStdout: true
                        ).trim()

                        echo "Previous production image: ${env.PREVIOUS_IMAGE}"
                    } else {
                        env.PREVIOUS_IMAGE = "NONE"
                        echo "No previous production container found."
                    }
                }
            }
        }

        stage('Create Network') {
            steps {
                bat """
                    docker network inspect ${NETWORK_NAME} >nul 2>&1 || docker network create ${NETWORK_NAME}
                """
            }
        }

        stage('Deploy New Version') {
            when {
                expression {
                    params.DEPLOYMENT_ACTION == 'DEPLOY'
                }
            }

            steps {
                script {

                    echo "OLD VERSION: ${env.PREVIOUS_IMAGE}"
                    echo "NEW VERSION: ${IMAGE_NAME}:${params.VERSION}"

                    bat """
                        docker rm -f ${CONTAINER_NAME}-new >nul 2>&1 || exit /b 0
                    """

                    bat """
                        docker run -d ^
                        --name ${CONTAINER_NAME}-new ^
                        --network ${NETWORK_NAME} ^
                        -p ${APP_PORT}:8081 ^
                        -e APP_VERSION=${params.VERSION} ^
                        -e ENVIRONMENT=${params.ENVIRONMENT} ^
                        ${IMAGE_NAME}:${params.VERSION}
                    """

                    echo "New version started."
                }
            }
        }

        stage('Health Check') {
            when {
                expression {
                    params.DEPLOYMENT_ACTION == 'DEPLOY'
                }
            }

            steps {
                script {

                    def health = bat(
                        script: """
                            powershell -Command "& { Start-Sleep -Seconds 15; \$status = docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME}-new; Write-Host \$status; if (\$status -ne 'healthy') { exit 1 } }"
                        """,
                        returnStatus: true
                    )

                    if (health != 0) {
                        echo "HEALTH CHECK FAILED"
                        env.ROLLBACK_REQUIRED = "YES"
                        error("New version failed health check.")
                    }

                    echo "HEALTH CHECK PASSED"
                }
            }
        }

        stage('Promote New Version') {
            when {
                expression {
                    params.DEPLOYMENT_ACTION == 'DEPLOY'
                }
            }

            steps {
                script {

                    bat """
                        docker rm -f ${CONTAINER_NAME} >nul 2>&1 || exit /b 0
                    """

                    bat """
                        docker rename ${CONTAINER_NAME}-new ${CONTAINER_NAME}
                    """

                    echo "New version promoted successfully."
                }
            }
        }

        stage('Rollback') {
            when {
                expression {
                    env.ROLLBACK_REQUIRED == "YES"
                }
            }

            steps {
                script {

                    echo "======================================"
                    echo "AUTOMATIC ROLLBACK STARTED"
                    echo "FAILED VERSION : ${IMAGE_NAME}:${params.VERSION}"
                    echo "OLD VERSION    : ${env.PREVIOUS_IMAGE}"
                    echo "======================================"

                    bat """
                        docker rm -f ${CONTAINER_NAME}-new >nul 2>&1 || exit /b 0
                    """

                    if (env.PREVIOUS_IMAGE != "NONE") {

                        bat """
                            docker rm -f ${CONTAINER_NAME} >nul 2>&1 || exit /b 0
                        """

                        bat """
                            docker run -d ^
                            --name ${CONTAINER_NAME} ^
                            --network ${NETWORK_NAME} ^
                            -p ${APP_PORT}:8081 ^
                            -e ENVIRONMENT=${params.ENVIRONMENT} ^
                            ${env.PREVIOUS_IMAGE}
                        """

                        echo "Previous version restored."
                    }
                }
            }
        }

        stage('Rollback Health Check') {
            when {
                expression {
                    env.ROLLBACK_REQUIRED == "YES"
                }
            }

            steps {
                script {

                    def rollbackHealth = bat(
                        script: """
                            powershell -Command "& { Start-Sleep -Seconds 15; \$status = docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME}; Write-Host \$status; if (\$status -ne 'healthy') { exit 1 } }"
                        """,
                        returnStatus: true
                    )

                    if (rollbackHealth != 0) {
                        error("ROLLBACK HEALTH CHECK FAILED.")
                    }

                    echo "ROLLBACK VERIFIED: Previous version is healthy."
                }
            }
        }
    }

    post {

        success {
            echo "======================================"
            echo "DEPLOYMENT SUCCESSFUL"
            echo "VERSION: ${params.VERSION}"
            echo "======================================"
        }

        failure {
            script {
                if (env.ROLLBACK_REQUIRED == "YES") {
                    echo "======================================"
                    echo "DEPLOYMENT FAILED"
                    echo "AUTOMATIC ROLLBACK COMPLETED"
                    echo "OLD VERSION: ${env.PREVIOUS_IMAGE}"
                    echo "FAILED VERSION: ${IMAGE_NAME}:${params.VERSION}"
                    echo "FINAL STATE: PREVIOUS VERSION RESTORED"
                    echo "======================================"
                } else {
                    echo "DEPLOYMENT FAILED"
                }
            }
        }
    }
}