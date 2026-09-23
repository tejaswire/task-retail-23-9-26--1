```groovy
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

        /*
         * ============================================================
         * 1. VALIDATE PARAMETERS
         * ============================================================
         */

        stage('Validate Parameters') {

            steps {

                script {

                    echo "======================================"
                    echo "DEPLOYMENT ACTION : ${params.DEPLOYMENT_ACTION}"
                    echo "ENVIRONMENT       : ${params.ENVIRONMENT}"
                    echo "VERSION            : ${params.VERSION}"
                    echo "CONFIRM PROD      : ${params.CONFIRM_PROD}"
                    echo "======================================"

                    if (
                        params.ENVIRONMENT == 'PRODUCTION' &&
                        params.DEPLOYMENT_ACTION == 'DEPLOY' &&
                        params.CONFIRM_PROD != 'YES'
                    ) {

                        error(
                            "Production deployment blocked. CONFIRM_PROD must be YES."
                        )
                    }

                    if (params.VERSION.trim() == '') {

                        error("VERSION cannot be empty.")
                    }
                }
            }
        }


        /*
         * ============================================================
         * 2. VALIDATE GIT TAG
         * ============================================================
         */

        stage('Validate Git Version') {

            steps {

                script {

                    bat """
                        @echo off
                        git fetch --tags --force
                    """

                    def tagStatus = bat(
                        script: """
                            @echo off
                            git rev-parse refs/tags/v${params.VERSION}
                        """,
                        returnStatus: true
                    )

                    if (tagStatus != 0) {

                        error(
                            "Git tag v${params.VERSION} does not exist."
                        )
                    }

                    def commitId = bat(
                        script: """
                            @echo off
                            git rev-list -n 1 refs/tags/v${params.VERSION}
                        """,
                        returnStdout: true
                    ).trim()

                    echo "Git tag       : v${params.VERSION}"
                    echo "Git commit    : ${commitId}"
                }
            }
        }


        /*
         * ============================================================
         * 3. CHECKOUT REQUESTED VERSION
         * ============================================================
         */

        stage('Checkout Requested Version') {
          steps {
             bat """
               @echo off
               git fetch --tags --force
               git checkout --force tags/v${params.VERSION}
             """
             echo "Checked out v${params.VERSION}"
             }
         }


        /*
         * ============================================================
         * 4. BUILD DOCKER IMAGE
         * ============================================================
         */

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


        /*
         * ============================================================
         * 5. RECORD CURRENT PRODUCTION VERSION
         * ============================================================
         */

        stage('Record Previous Production') {

            when {

                expression {

                    params.DEPLOYMENT_ACTION == 'DEPLOY'
                }
            }

            steps {

                script {

                    def containerExists = bat(
                        script: """
                            @echo off
                            "${DOCKER}" inspect ${CONTAINER_NAME} >nul 2>&1
                        """,
                        returnStatus: true
                    )

                    if (containerExists == 0) {

                        env.PREVIOUS_IMAGE = bat(
                            script: """
                                @echo off
                                "${DOCKER}" inspect ${CONTAINER_NAME} --format="{{.Config.Image}}"
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


        /*
         * ============================================================
         * 6. CREATE DOCKER NETWORK
         * ============================================================
         */

        stage('Create Network') {

            steps {

                bat """
                    "${DOCKER}" network inspect ${NETWORK_NAME} >nul 2>&1 || "${DOCKER}" network create ${NETWORK_NAME}
                """

                echo "Docker network ${NETWORK_NAME} is ready."
            }
        }


        /*
         * ============================================================
         * 7. DEPLOY NEW VERSION
         *
         * New version uses temporary HOST port 8082.
         * Container still listens internally on 8081.
         * ============================================================
         */

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

                    /*
                     * Remove any old temporary candidate container.
                     */

                    bat """
                        "${DOCKER}" rm -f ${CONTAINER_NAME}-new >nul 2>&1 || exit /b 0
                    """


                    /*
                     * Start candidate version on temporary port 8082.
                     */

                    bat """
                        "${DOCKER}" run -d ^
                        --name ${CONTAINER_NAME}-new ^
                        --network ${NETWORK_NAME} ^
                        -p 8082:8081 ^
                        -e APP_VERSION=${params.VERSION} ^
                        -e ENVIRONMENT=${params.ENVIRONMENT} ^
                        ${IMAGE_NAME}:${params.VERSION}
                    """

                    echo "New version started on temporary port 8082."
                }
            }
        }


        /*
         * ============================================================
         * 8. HEALTH CHECK
         * ============================================================
         */

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
                            powershell -Command "& { Start-Sleep -Seconds 15; \$status = \\"${DOCKER}\\" inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME}-new; Write-Host \$status; if (\$status -ne 'healthy') { exit 1 } }"
                        """,
                        returnStatus: true
                    )


                    if (health != 0) {

                        echo "======================================"
                        echo "HEALTH CHECK FAILED"
                        echo "ROLLBACK REQUIRED"
                        echo "======================================"

                        env.ROLLBACK_REQUIRED = "YES"

                    } else {

                        echo "======================================"
                        echo "HEALTH CHECK PASSED"
                        echo "NO ROLLBACK REQUIRED"
                        echo "======================================"

                        env.ROLLBACK_REQUIRED = "NO"
                    }
                }
            }
        }


        /*
         * ============================================================
         * 9. PROMOTE NEW VERSION
         *
         * Runs ONLY when health check succeeds.
         * ============================================================
         */

        stage('Promote New Version') {

            when {

                allOf {

                    expression {

                        params.DEPLOYMENT_ACTION == 'DEPLOY'
                    }

                    expression {

                        env.ROLLBACK_REQUIRED != 'YES'
                    }
                }
            }

            steps {

                script {

                    /*
                     * Remove old production container.
                     */

                    bat """
                        "${DOCKER}" rm -f ${CONTAINER_NAME} >nul 2>&1 || exit /b 0
                    """


                    /*
                     * Rename healthy candidate to production.
                     */

                    bat """
                        "${DOCKER}" rename ${CONTAINER_NAME}-new ${CONTAINER_NAME}
                    """

                    echo "New version promoted successfully."
                }
            }
        }


        /*
         * ============================================================
         * 10. AUTOMATIC ROLLBACK
         * ============================================================
         */

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


                    /*
                     * Remove failed candidate.
                     */

                    bat """
                        "${DOCKER}" rm -f ${CONTAINER_NAME}-new >nul 2>&1 || exit /b 0
                    """


                    /*
                     * Restore previous production version.
                     */

                    if (env.PREVIOUS_IMAGE != "NONE") {

                        bat """
                            "${DOCKER}" rm -f ${CONTAINER_NAME} >nul 2>&1 || exit /b 0
                        """


                        bat """
                            "${DOCKER}" run -d ^
                            --name ${CONTAINER_NAME} ^
                            --network ${NETWORK_NAME} ^
                            -p ${APP_PORT}:8081 ^
                            -e APP_VERSION=${env.PREVIOUS_IMAGE.split(':')[-1]} ^
                            -e ENVIRONMENT=${params.ENVIRONMENT} ^
                            ${env.PREVIOUS_IMAGE}
                        """

                        echo "Previous version restored."
                    }
                }
            }
        }


        /*
         * ============================================================
         * 11. VERIFY ROLLBACK
         * ============================================================
         */

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
                            powershell -Command "& { Start-Sleep -Seconds 15; \$status = \\"${DOCKER}\\" inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME}; Write-Host \$status; if (\$status -ne 'healthy') { exit 1 } }"
                        """,
                        returnStatus: true
                    )


                    if (rollbackHealth != 0) {

                        error(
                            "ROLLBACK HEALTH CHECK FAILED."
                        )
                    }


                    echo "======================================"
                    echo "ROLLBACK VERIFIED"
                    echo "Previous version is healthy."
                    echo "======================================"
                }
            }
        }
    }


    /*
     * ================================================================
     * POST ACTIONS
     * ================================================================
     */

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

                    echo "======================================"
                    echo "DEPLOYMENT FAILED"
                    echo "======================================"
                }
            }
        }
    }
}
```
